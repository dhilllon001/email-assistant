import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Inbox,
  Search,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Paperclip,
  ShieldAlert,
  MoreHorizontal,
  Check,
  Pencil,
  MessageSquarePlus,
  Copy,
  History,
  UserX,
  CornerUpLeft,
  X,
  Command,
  Undo2,
  Zap,
  Sun,
  Moon,
} from 'lucide-react'
import { EMAILS, TIERS, INTENTS, AUTO_OK } from './data'

function confColor(value) {
  if (value >= AUTO_OK) return 'var(--green)'
  if (value >= 80) return 'var(--orange)'
  return 'var(--red)'
}

function Ring({ value, initials }) {
  const c = 2 * Math.PI * 15
  const tone = confColor(value)
  return (
    <div className="ava" title={`AI confidence ${value}%`}>
      <svg viewBox="0 0 34 34" aria-hidden="true">
        <circle cx="17" cy="17" r="15" fill="none" stroke="var(--ring-track)" strokeWidth="2.5" />
        <circle
          cx="17"
          cy="17"
          r="15"
          fill="none"
          stroke={tone}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={`${(value / 100) * c} ${c}`}
        />
      </svg>
      <span>{initials}</span>
    </div>
  )
}

function TabBtn({ label, count, active, onClick }) {
  return (
    <button type="button" className="ftab" data-on={active ? '1' : '0'} onClick={onClick}>
      <span className="ftab-label">{label}</span>
      {count !== undefined && <span className="ftab-count mono">{count}</span>}
    </button>
  )
}

function AttachmentPopup({ file, onClose }) {
  if (!file) return null
  return (
    <div className="att-overlay" onClick={onClose} role="presentation">
      <div
        className="att-popup"
        role="dialog"
        aria-modal="true"
        aria-label={file.name}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="att-popup-hd">
          <Paperclip size={16} />
          <div>
            <b>{file.name}</b>
            <small className="mono">{file.size}</small>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={15} />
          </button>
        </div>
        <p className="att-popup-note">Preview this attachment, or download a copy to your computer.</p>
        <div className="att-popup-actions">
          <button type="button" className="ghost" onClick={onClose}>
            Close
          </button>
          <button type="button" className="primary att-download" onClick={onClose}>
            Download
          </button>
        </div>
      </div>
    </div>
  )
}

function useTheme() {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('ca-theme-v3')
    return saved === 'dark' ? 'dark' : 'light'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('ca-theme-v3', theme)
  }, [theme])

  return [theme, setTheme]
}

export default function App() {
  const [theme, setTheme] = useTheme()
  const [selId, setSelId] = useState('e0')
  const [tab, setTab] = useState('')
  const [tier, setTier] = useState('')
  const [intent, setIntent] = useState('')
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState({})
  const [drafts, setDrafts] = useState({})
  const [tone, setTone] = useState({})
  const [lang, setLang] = useState({})
  const [showRcpt, setShowRcpt] = useState(false)
  const [kebab, setKebab] = useState(false)
  const [toast, setToast] = useState(null)
  const [openFile, setOpenFile] = useState(null)
  const editorRef = useRef(null)

  const statusTabs = ['Pending', 'Edited', 'Approved', 'Manual']

  const counts = useMemo(
    () => ({
      Pending: EMAILS.filter((e) => !status[e.id]).length,
      Edited: EMAILS.filter((e) => status[e.id] === 'edited').length,
      Approved: EMAILS.filter((e) => status[e.id] === 'approved').length,
      Manual: EMAILS.filter((e) => e.tier === 'Review' || e.tier === 'Escalation').length,
    }),
    [status],
  )

  const tierTabs = useMemo(
    () =>
      TIERS.slice(1)
        .map((t) => ({ key: t, count: EMAILS.filter((e) => e.tier === t).length }))
        .filter((t) => t.count > 0),
    [],
  )

  const intentTabs = useMemo(
    () =>
      INTENTS.slice(1)
        .map((i) => ({ key: i, count: EMAILS.filter((e) => e.intent === i).length }))
        .filter((i) => i.count > 0),
    [],
  )

  const visibleStatusTabs = statusTabs.filter((s) => counts[s] > 0)

  const list = useMemo(
    () =>
      EMAILS.filter((e) => {
        if (tab === 'Pending' && status[e.id]) return false
        if (tab === 'Edited' && status[e.id] !== 'edited') return false
        if (tab === 'Approved' && status[e.id] !== 'approved') return false
        if (tab === 'Manual' && e.tier !== 'Review' && e.tier !== 'Escalation') return false
        if (tier && e.tier !== tier) return false
        if (intent && e.intent !== intent) return false
        if (query) {
          const hay = `${e.subject} ${e.from} ${e.po} ${e.ref}`.toLowerCase()
          if (!hay.includes(query.toLowerCase())) return false
        }
        return true
      }),
    [tab, tier, intent, query, status],
  )

  const pickTab = (value, current, setter) => {
    setter(current === value ? '' : value)
  }

  const sel = EMAILS.find((e) => e.id === selId) || list[0] || EMAILS[0]
  const selTone = sel.tones.find((t) => t.id === (tone[sel.id] || sel.tones[0].id)) || sel.tones[0]
  const selLang = lang[sel.id] || (sel.langs.includes('EN') ? 'EN' : sel.langs[0])
  const generated = selTone[selLang] || selTone[sel.langs[0]]
  const text = drafts[sel.id] !== undefined ? drafts[sel.id] : generated
  const dirty = drafts[sel.id] !== undefined && drafts[sel.id] !== generated
  const bulk = list.filter((e) => !status[e.id] && e.confidence >= AUTO_OK)
  const confTone = confColor(sel.confidence)

  const step = (dir) => {
    const i = list.findIndex((e) => e.id === sel.id)
    const next = list[Math.min(list.length - 1, Math.max(0, (i < 0 ? 0 : i) + dir))]
    if (next) {
      setSelId(next.id)
      setShowRcpt(false)
    }
  }

  const flash = (msg, undo) => setToast({ msg, undo })

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 4200)
    return () => clearTimeout(t)
  }, [toast])

  const approve = (id = sel.id, advance = true) => {
    const prev = status[id]
    setStatus((s) => ({ ...s, [id]: 'approved' }))
    flash('Reply sent · moved to Approved', () => setStatus((s) => ({ ...s, [id]: prev })))
    if (advance) {
      const rest = list.filter((e) => e.id !== id && !status[e.id])
      if (rest[0]) setSelId(rest[0].id)
    }
  }

  const approveAll = () => {
    const ids = bulk.map((e) => e.id)
    setStatus((s) => ({ ...s, ...Object.fromEntries(ids.map((i) => [i, 'approved'])) }))
    flash(`${ids.length} replies sent`, () =>
      setStatus((s) => {
        const n = { ...s }
        ids.forEach((i) => delete n[i])
        return n
      }),
    )
  }

  const onEdit = (v) => {
    setDrafts((d) => ({ ...d, [sel.id]: v }))
    if (v !== generated) {
      setStatus((s) => (s[sel.id] === 'approved' ? s : { ...s, [sel.id]: 'edited' }))
    }
  }

  useEffect(() => {
    if (!openFile) return
    const onKey = (e) => {
      if (e.key === 'Escape') setOpenFile(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [openFile])

  useEffect(() => {
    const key = (e) => {
      const typing = /INPUT|TEXTAREA/.test(e.target.tagName)
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        approve()
        return
      }
      if (!typing && e.key === '/') {
        e.preventDefault()
        document.querySelector('.queue-search input')?.focus()
        return
      }
      if (typing) return
      if (e.key === 'j' || e.key === 'ArrowDown') {
        e.preventDefault()
        step(1)
      }
      if (e.key === 'k' || e.key === 'ArrowUp') {
        e.preventDefault()
        step(-1)
      }
      if (e.key === 'a') {
        e.preventDefault()
        approve()
      }
      if (e.key === 'e') {
        e.preventDefault()
        editorRef.current?.focus()
      }
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  })

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <strong className="brand-title">Email Assistant</strong>
        </div>

        <div className="top-right">
          <button
            className="theme-toggle"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            title={theme === 'dark' ? 'Switch to light' : 'Switch to dark'}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button className="user-ava" type="button" title="arshdeep.singh@chargerlogistics.com" aria-label="Account">
            AS
          </button>
        </div>
      </header>

      <div className="toolbar">
        <nav className="tabbar" aria-label="Queue filters">
          {visibleStatusTabs.map((s) => (
            <TabBtn
              key={s}
              label={s}
              count={counts[s]}
              active={tab === s}
              onClick={() => pickTab(s, tab, setTab)}
            />
          ))}
          {visibleStatusTabs.length > 0 && tierTabs.length > 0 && <span className="tab-sep" aria-hidden="true" />}
          {tierTabs.map((t) => (
            <TabBtn
              key={t.key}
              label={t.key}
              count={t.count}
              active={tier === t.key}
              onClick={() => pickTab(t.key, tier, setTier)}
            />
          ))}
          {(visibleStatusTabs.length > 0 || tierTabs.length > 0) && intentTabs.length > 0 && (
            <span className="tab-sep" aria-hidden="true" />
          )}
          {intentTabs.map((i) => (
            <TabBtn
              key={i.key}
              label={i.key}
              count={i.count}
              active={intent === i.key}
              onClick={() => pickTab(i.key, intent, setIntent)}
            />
          ))}
        </nav>
        <div className="toolbar-right">
          {bulk.length > 0 && (
            <div className="toolbar-bulk">
              <span className="toolbar-drafts">
                <Zap size={14} />
                <b className="mono">{bulk.length}</b>
                {bulk.length === 1 ? 'draft' : 'drafts'}
              </span>
              {bulk.length > 1 && (
                <button type="button" className="toolbar-send" onClick={approveAll}>
                  <Check size={13} />
                  Send all
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="body">
        <section className="pane queue">
          <div className="pane-hd">
            <Inbox size={16} style={{ color: 'var(--blue)', flex: '0 0 auto' }} />
            <h2>Inbox queue</h2>
            <span className="mono queue-count">{list.length}</span>
            <label className="queue-search">
              <Search size={14} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search sender, PO, subject…"
              />
              <span className="kbd">/</span>
            </label>
          </div>

          {list.length === 0 ? (
            <div className="empty">
              <Check size={22} style={{ color: 'var(--green)' }} />
              <b>Queue clear</b>
              <span style={{ fontSize: 12 }}>New mail lands here as it arrives.</span>
            </div>
          ) : (
            <div className="list">
              {list.map((e) => {
                const st = status[e.id]
                return (
                  <button
                    key={e.id}
                    className="row"
                    data-sel={e.id === sel.id ? '1' : '0'}
                    data-done={st === 'approved' ? '1' : '0'}
                    onClick={() => {
                      setSelId(e.id)
                      setShowRcpt(false)
                      setOpenFile(null)
                    }}
                  >
                    <Ring value={e.confidence} initials={e.initials} />
                    <div className="row-main">
                      <div className="row-top">
                        <span className="row-from">{e.from}</span>
                        <span className="row-time mono">{e.time}</span>
                      </div>
                      <p className="row-subj">{e.subject}</p>
                      <div className="row-meta">
                        <span className="chip po mono">{e.po}</span>
                        {st === 'approved' ? (
                          <span className="tag go">Sent</span>
                        ) : st === 'edited' ? (
                          <span className="tag">Edited</span>
                        ) : e.tier === 'Review' || e.tier === 'Escalation' ? (
                          <span className="tag hold">{e.tier}</span>
                        ) : (
                          <span className="tag mute">{e.sub.split(' / ')[0]}</span>
                        )}
                        {e.attachments.length > 0 && (
                          <span className="att-inline mono" title={e.attachments.map((a) => a.name).join(', ')}>
                            <Paperclip size={11} />
                            {e.attachments.length}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          <div className="legend">
            <span>
              <span className="kbd">J</span>
              <span className="kbd">K</span> move
            </span>
            <span>
              <span className="kbd">E</span> edit
            </span>
            <span>
              <span className="kbd">A</span> approve
            </span>
            <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Command size={11} /> shortcuts
            </span>
          </div>
        </section>

        <section className="pane thread">
          <div className="thread-hd">
            <div className="thread-hd-top">
              <h1>{sel.subject}</h1>
              <div className="nav">
                <button onClick={() => step(-1)} title="Previous (K)">
                  <ChevronLeft size={15} />
                </button>
                <i />
                <button onClick={() => step(1)} title="Next (J)">
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
            <div className="thread-meta">
              <span className="chip po mono">{sel.po}</span>
              <span className="chip ref mono">{sel.ref}</span>
              <span className="thread-lane">{sel.lane}</span>
            </div>
          </div>

          <div className="scroll">
            <div className="ext">
              <ShieldAlert size={14} style={{ flex: '0 0 auto' }} />
              External sender — verify before opening links or attachments.
            </div>

            <article className="msg" key={sel.id}>
              <div className="mail-head">
                <div className="mail-from">
                  <Ring value={sel.confidence} initials={sel.initials} />
                  <div className="who">
                    <div className="who-line">
                      <b>{sel.from}</b>
                      <span className="mono who-email">&lt;{sel.email}&gt;</span>
                    </div>
                    <div className="mail-field">
                      <span className="mail-label">To:</span>
                      <span className="mail-value">
                        {showRcpt
                          ? sel.to.join('; ')
                          : `${sel.to[0]}${sel.to.length + sel.ccCount > 1 ? `; +${sel.to.length - 1 + sel.ccCount} more` : ''}`}
                      </span>
                      {(sel.to.length > 1 || sel.ccCount > 0) && (
                        <button type="button" className="mail-more" onClick={() => setShowRcpt(!showRcpt)}>
                          {showRcpt ? 'Hide' : 'Details'}
                          <ChevronDown size={12} style={{ transform: showRcpt ? 'rotate(180deg)' : 'none' }} />
                        </button>
                      )}
                    </div>
                    {showRcpt && (
                      <div className="mail-field">
                        <span className="mail-label">Cc:</span>
                        <span className="mail-value">{sel.ccCount} recipients on distribution list</span>
                      </div>
                    )}
                  </div>
                  <time className="mono mail-date">{sel.stamp}</time>
                </div>

                {sel.attachments.length > 0 && (
                  <div className="mail-atts">
                    <div className="mail-atts-label">
                      <Paperclip size={13} />
                      {sel.attachments.length} Attachment{sel.attachments.length > 1 ? 's' : ''}
                    </div>
                    <div className="mail-atts-list">
                      {sel.attachments.map((a) => (
                        <button
                          key={a.name}
                          type="button"
                          className="mail-att-item"
                          onClick={() => setOpenFile(a)}
                          title={`${a.name} (${a.size})`}
                        >
                          <span className="mail-att-name">{a.name}</span>
                          <span className="mono mail-att-size">{a.size}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="msg-body">
                {sel.body}
                {sel.table && (
                  <div className="mail-table-wrap">
                    <table className="mail-table">
                      <thead>
                        <tr>
                          {sel.table.headers.map((h) => (
                            <th key={h}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {sel.table.rows.map((row, i) => (
                          <tr key={i}>
                            {row.map((cell, j) => (
                              <td key={j}>{cell}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </article>
          </div>
        </section>

        <section className="pane draft">
          <div className="pane-hd">
            <CornerUpLeft size={16} style={{ color: 'var(--green)' }} />
            <h2>AI draft reply</h2>
            <div className="menu-wrap" style={{ marginLeft: 'auto' }}>
              <button className="icon-btn" onClick={() => setKebab(!kebab)}>
                <MoreHorizontal size={15} />
              </button>
              {kebab && (
                <div className="menu right">
                  <button
                    onClick={() => {
                      setKebab(false)
                      flash('Draft history opened')
                    }}
                  >
                    <History size={13} />
                    Draft history
                  </button>
                  <button
                    onClick={() => {
                      setKebab(false)
                      flash('Classification editor opened')
                    }}
                  >
                    <Pencil size={13} />
                    Change classification
                  </button>
                  <hr />
                  <button
                    onClick={() => {
                      setKebab(false)
                      flash(`Ignoring ${sel.email}`)
                    }}
                    style={{ color: 'var(--red)' }}
                  >
                    <UserX size={13} />
                    Ignore this sender
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="draft-scroll">
            <div className="draft-classify">
              <div className="draft-classify-top">
                <div className="draft-chip-row">
                  <span className="draft-chip">{sel.dept}</span>
                  <span className="draft-chip">{sel.intent}</span>
                  <span
                    className="draft-chip"
                    data-tone={sel.tier === 'Review' || sel.tier === 'Escalation' ? 'warn' : 'ok'}
                  >
                    {sel.tier}
                  </span>
                </div>
                <div className="draft-conf">
                  <div className="draft-conf-score">
                    <span className="meta-key">Confidence</span>
                    <b className="mono" style={{ color: confTone }}>
                      {sel.confidence}%
                    </b>
                  </div>
                  <div className="bar">
                    <i style={{ width: `${sel.confidence}%`, background: confTone }} />
                  </div>
                  <button type="button" className="link-btn draft-edit-btn">
                    <Pencil size={12} />
                    Edit
                  </button>
                </div>
              </div>
              <div className="draft-classify-meta">
                <span>{sel.sub}</span>
                <span className="draft-meta-dot" aria-hidden="true">
                  ·
                </span>
                <span className="draft-reason">{sel.reason}</span>
              </div>
            </div>

            <div className="draft-main">
              <div className="draft-main-hd">
                <span className="eyebrow">Reply draft</span>
                <div className="draft-main-tools">
                  {sel.langs.length > 1 && (
                    <div className="lang">
                      {sel.langs.map((l) => (
                        <button
                          key={l}
                          type="button"
                          data-on={selLang === l ? '1' : '0'}
                          onClick={() => {
                            setLang((s) => ({ ...s, [sel.id]: l }))
                            setDrafts((d) => {
                              const n = { ...d }
                              delete n[sel.id]
                              return n
                            })
                          }}
                        >
                          {l}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="tone">
                    {sel.tones.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        data-on={selTone.id === t.id ? '1' : '0'}
                        onClick={() => {
                          setTone((s) => ({ ...s, [sel.id]: t.id }))
                          setDrafts((d) => {
                            const n = { ...d }
                            delete n[sel.id]
                            return n
                          })
                        }}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="composer">
                <div className="compose-row">
                  <span className="compose-label">To</span>
                  <span className="compose-value mono">{sel.email}</span>
                </div>
                <div className="compose-row">
                  <span className="compose-label">Subject</span>
                  <span className="compose-value">Re: {sel.subject}</span>
                </div>
                <textarea
                  ref={editorRef}
                  className="editor"
                  value={text}
                  onChange={(e) => onEdit(e.target.value)}
                  spellCheck={false}
                />
                <div className="editor-foot">
                  <button type="button" className="insert mono" onClick={() => onEdit(`${text} ${sel.po}`)}>
                    + {sel.po}
                  </button>
                  <button type="button" className="insert mono" onClick={() => onEdit(`${text} ${sel.ref}`)}>
                    + {sel.ref}
                  </button>
                  <button type="button" className="insert mono" onClick={() => onEdit(`${text} ETA 30/JUL 14:00`)}>
                    + ETA
                  </button>
                  {dirty && (
                    <span className="dirty">
                      <Pencil size={10} />
                      Edited from AI draft
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="actions">
            <button
              className="ghost"
              onClick={() => {
                setDrafts((d) => {
                  const n = { ...d }
                  delete n[sel.id]
                  return n
                })
                flash('Reverted to AI draft')
              }}
            >
              <Undo2 size={13} />
              Revert
            </button>
            <button className="ghost ghost-icon" onClick={() => flash('Comment thread opened')} title="Comment">
              <MessageSquarePlus size={14} />
            </button>
            <button className="ghost ghost-icon" onClick={() => flash('Copied to clipboard')} title="Copy">
              <Copy size={14} />
            </button>
            <button className="primary" onClick={() => approve()}>
              <Check size={15} />
              Approve &amp; next
              <span className="kbd">⌘⏎</span>
            </button>
          </div>
        </section>
      </div>

      {toast && (
        <div className="toast" role="status">
          <Check size={14} style={{ color: 'var(--green)' }} />
          <span>{toast.msg}</span>
          {toast.undo && (
            <button
              className="undo"
              onClick={() => {
                toast.undo()
                setToast(null)
              }}
            >
              <Undo2 size={12} />
              Undo
            </button>
          )}
          <button onClick={() => setToast(null)} style={{ color: 'var(--label-3)' }}>
            <X size={13} />
          </button>
        </div>
      )}

      <AttachmentPopup file={openFile} onClose={() => setOpenFile(null)} />
    </div>
  )
}
