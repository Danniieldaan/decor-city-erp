import { useState, useEffect } from 'react'
import { productions, prodStages } from '../lib/db'
import { fd, esc } from '../lib/utils'
import { SL, STAGES } from '../lib/constants'

export default function DatesLog() {
  const [jobs, setJobs] = useState([])
  const [stagesByJob, setStagesByJob] = useState({})
  const [allStageKeys, setAllStageKeys] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const all = await productions.getAll()
        setJobs(all)
        const sMap = {}
        const keysSet = new Set()
        for (const p of all) {
          const st = await prodStages.getByProduction(p.id)
          sMap[p.id] = st
          st.forEach(s => {
            if (s.date || s.dateOverride) keysSet.add(s.sk)
          })
        }
        setStagesByJob(sMap)
        const ordered = STAGES.filter(k => keysSet.has(k))
        setAllStageKeys(ordered.length ? ordered : [...keysSet])
      } catch (err) {
        console.error('Load error:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  function getStages(pid) { return stagesByJob[pid] || [] }

  function getFrameLabel(job) {
    if (!job) return ''
    if (job.frames && job.frames.length) {
      const types = [...new Set(job.frames.map(f => f.frame_type))]
      return types.join(', ')
    }
    return job.frame_type || ''
  }

  function getSize(job) {
    if (!job) return ''
    if (job.frames && job.frames.length) {
      return job.frames.map(f => (f.width || '-') + 'x' + (f.height || '-')).join(', ')
    }
    return (job.width || '-') + 'x' + (job.height || '-')
  }

  function stageDisplay(pid, sk) {
    const st = getStages(pid).find(s => s.sk === sk)
    if (!st) return null
    const d = st.dateOverride || st.date
    if (!d) return null
    return fd(d)
  }

  return (
    <div>
      <div className="ph">
        <div className="pt">Dates Log</div>
        <div className="ps">Stage completion dates for all production jobs</div>
      </div>

      <div className="actb">
        <div className="vlbl">{jobs.length} job{jobs.length !== 1 ? 's' : ''}</div>
      </div>

      {loading ? (
        <div className="empty">Loading...</div>
      ) : jobs.length === 0 ? (
        <div className="empty">No production jobs found</div>
      ) : allStageKeys.length === 0 ? (
        <div className="empty">No completed stages yet</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="dt" style={{ minWidth: allStageKeys.length * 130 + 350 }}>
            <thead>
              <tr>
                <th>Job ID</th>
                <th>Frame</th>
                <th>Size</th>
                {allStageKeys.map(sk => (
                  <th key={sk} style={{ textAlign: 'center', fontSize: '0.65rem' }}>{SL[sk] || sk}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {jobs.map(job => (
                <tr key={job.id}>
                  <td style={{ fontWeight: 600 }}>#{job.id}</td>
                  <td style={{ fontSize: '0.75rem' }}>{esc(getFrameLabel(job))}</td>
                  <td style={{ fontSize: '0.75rem' }}>{esc(getSize(job))}</td>
                  {allStageKeys.map(sk => {
                    const val = stageDisplay(job.id, sk)
                    return (
                      <td key={sk} style={{ textAlign: 'center', fontSize: '0.6875rem', color: val ? '#166534' : '#94a3b8' }}>
                        {val || '\u2014'}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
