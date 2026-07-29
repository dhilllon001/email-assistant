import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Inbox,
  Search,
  RefreshCw,
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
  Users,
  Filter,
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

function Menu({ label, value, options, onPick, active, align }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const away = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', away)
    return () => document.removeEventListener('mousedown', away)
  }, [open])

  return (
    <div className="menu-wrap" ref={ref}>
      <button className="pill" data-on={active ? '1' : '0'} onClick={() => setOpen(!open)}>
        {label && <span>{label}</span>}
        <b>{value}</b>
        <ChevronDown size={12} />
      </button>
      {open && (
        <div className={`menu${align === 'right' ? ' right' : ''}`}>
          {options.map((o) => (
            <button
              key={o}
              data-on={o === value ? '1' : '0'}
              onClick={() => {
                onPick(o)
                setOpen(false)
              }}
            >
              <Check size={13} style={{ opacity: o === value ? 1 : 0, flex: '0 0 auto' }} />
              {o}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function AttachmentLine({ files, onOpen }) {
  if (!files?.length) return null
  return (
    <div className="att-line">
      <span className="att-line-label">Attachments</span>
      <div className="att-line-links">
        {files.map((a, i) => (
          <span key={a.name} className="att-line-item">
            {i > 0 && <span className="att-line-sep">·</span>}
            <button
              type="button"
              className="att-link"
              onClick={() => onOpen(a)}
              title={`${a.name} (${a.size})`}
            >
              {a.name}
            </button>
          </span>
        ))}
      </div>
    </div>
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
    const saved = localStorage.getItem('ca-theme-v2')
    return saved === 'dark' ? 'dark' : 'light'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('ca-theme-v2', theme)
  }, [theme])

  return [theme, setTheme]
}

export default function App() {
  const [theme, setTheme] = useTheme()
  const [selId, setSelId] = useState('e1')
  const [tab, setTab] = useState('Pending')
  const [tier, setTier] = useState('All tiers')
  const [intent, setIntent] = useState('All intents')
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

  const counts = useMemo(
    () => ({
      All: EMAILS.length,
      Pending: EMAILS.filter((e) => !status[e.id]).length,
      Edited: EMAILS.filter((e) => status[e.id] === 'edited').length,
      Approved: EMAILS.filter((e) => status[e.id] === 'approved').length,
      Manual: EMAILS.filter((e) => e.tier === 'Review').length,
    }),
    [status],
  )

  const list = useMemo(
    () =>
      EMAILS.filter((e) => {
        if (tab === 'Pending' && status[e.id]) return false
        if (tab === 'Edited' && status[e.id] !== 'edited') return false
        if (tab === 'Approved' && status[e.id] !== 'approved') return false
        if (tab === 'Manual' && e.tier !== 'Review') return false
        if (tier !== 'All tiers' && e.tier !== tier) return false
        if (intent !== 'All intents' && e.intent !== intent) return false
        if (query) {
          const hay = `${e.subject} ${e.from} ${e.po} ${e.ref}`.toLowerCase()
          if (!hay.includes(query.toLowerCase())) return false
        }
        return true
      }),
    [tab, tier, intent, query, status],
  )

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
        document.querySelector('.search input')?.focus()
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

        <label className="search">
          <Search size={15} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search sender, subject, PO or reference"
          />
          <span className="kbd">/</span>
        </label>

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

      <div className="body">
        <section className="pane queue">
          <div className="pane-hd">
            <Inbox size={16} style={{ color: 'var(--blue)' }} />
            <h2>Inbox queue</h2>
            <span className="mono" style={{ color: 'var(--label-3)', fontSize: 12 }}>
              {list.length}
            </span>
            <button className="icon-btn" style={{ marginLeft: 'auto' }} title="Refresh">
              <RefreshCw size={14} />
            </button>
          </div>

          <div className="seg">
            {['All', 'Pending', 'Edited', 'Approved', 'Manual'].map((t) => (
              <button key={t} data-on={tab === t ? '1' : '0'} onClick={() => setTab(t)}>
                {t}
                <span className="n">{counts[t]}</span>
              </button>
            ))}
          </div>

          <div className="filters">
            <Filter size={13} style={{ color: 'var(--label-3)', flex: '0 0 auto' }} />
            <Menu value={tier} options={TIERS} onPick={setTier} active={tier !== 'All tiers'} />
            <Menu
              value={intent === 'All intents' ? 'All intents' : intent.split(' ')[0]}
              options={INTENTS}
              onPick={setIntent}
              active={intent !== 'All intents'}
            />
          </div>

          {bulk.length > 1 && (
            <div className="bulk">
              <Zap size={15} style={{ color: 'var(--green)', flex: '0 0 auto' }} />
              <p>
                <b className="mono">{bulk.length}</b> drafts at {AUTO_OK}%+ confidence
                <br />
                <span>Same acknowledgement pattern</span>
              </p>
              <button className="send-all" onClick={approveAll}>
                <Check size={13} />
                Send all
              </button>
            </div>
          )}

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
                        ) : e.tier === 'Review' ? (
                          <span className="tag hold">Review</span>
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
            <h1>{sel.subject}</h1>
            <div className="thread-meta">
              <span className="chip po mono">{sel.po}</span>
              <span className="chip ref mono">{sel.ref}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--label-2)' }}>{sel.lane}</span>
              <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--label-3)' }}>· 1 message</span>
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
          </div>

          <div className="scroll">
            <div className="ext">
              <ShieldAlert size={14} style={{ flex: '0 0 auto' }} />
              External sender — verify before opening links or attachments.
            </div>

            <article className="msg" key={sel.id}>
              <div className="msg-hd">
                <Ring value={sel.confidence} initials={sel.initials} />
                <div className="who">
                  <b>{sel.from}</b>
                  <small className="mono">{sel.email}</small>
                </div>
                <div className="msg-hd-right">
                  <AttachmentLine files={sel.attachments} onOpen={setOpenFile} />
                  <span className="mono msg-stamp">{sel.stamp}</span>
                </div>
              </div>

              <div className="rcpt">
                <span style={{ color: 'var(--label-3)' }}>to</span>
                <span>{sel.to[0].split('@')[0].replace('.', ' ')}</span>
                <button onClick={() => setShowRcpt(!showRcpt)}>
                  <Users size={11} />
                  {sel.to.length - 1 + sel.ccCount} more
                  <ChevronDown size={11} style={{ transform: showRcpt ? 'rotate(180deg)' : 'none' }} />
                </button>
              </div>

              {showRcpt && (
                <div className="rcpt-full mono">
                  <div>
                    <em>To</em>
                    {sel.to.join(', ')}
                  </div>
                  <div style={{ marginTop: 6 }}>
                    <em>Cc</em>
                    {sel.ccCount} recipients on distribution list
                  </div>
                </div>
              )}

              <div className="msg-highlights">
                <span className="chip po mono">{sel.po}</span>
                <span className="chip ref mono">{sel.ref}</span>
              </div>

              <div className="msg-body">{sel.body}</div>
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
            <div className="card">
              <div className="card-hd">
                <span className="eyebrow">Classification</span>
                <button className="pill" style={{ height: 24 }}>
                  <Pencil size={11} />
                  Change
                </button>
              </div>
              <div className="kv">
                <span className="tag mute">{sel.dept}</span>
                <span className="tag">{sel.intent}</span>
                <span className={`tag ${sel.confidence < 80 ? 'hold' : 'mute'}`}>{sel.sub}</span>
              </div>
              <div className="conf">
                <span className="eyebrow" style={{ flex: '0 0 auto' }}>
                  Confidence
                </span>
                <div className="bar">
                  <i style={{ width: `${sel.confidence}%`, background: confTone }} />
                </div>
                <span className="v mono" style={{ color: confTone }}>
                  {sel.confidence}%
                </span>
              </div>
            </div>

            <div className="card route">
              <div>
                <span className="eyebrow">Routing tier</span>
                <b style={{ color: sel.tier === 'Review' ? 'var(--red)' : 'var(--label-1)' }}>{sel.tier}</b>
              </div>
              <div>
                <span className="eyebrow">Reason</span>
                <b>{sel.reason}</b>
              </div>
            </div>

            <div className="card draft-block">
              <div className="card-hd" style={{ marginBottom: 0 }}>
                <span className="eyebrow">Draft</span>
                {sel.langs.length > 1 && (
                  <div className="lang">
                    {sel.langs.map((l) => (
                      <button
                        key={l}
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
              </div>

              <div className="tone">
                {sel.tones.map((t) => (
                  <button
                    key={t.id}
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

              <div className="composer">
                <div className="to-row">
                  <span className="eyebrow" style={{ flex: '0 0 auto' }}>
                    To
                  </span>
                  <span className="addr mono">{sel.email}</span>
                </div>
                <textarea
                  ref={editorRef}
                  className="editor"
                  value={text}
                  onChange={(e) => onEdit(e.target.value)}
                  spellCheck={false}
                />
                <div className="editor-foot">
                  <button className="insert mono" onClick={() => onEdit(`${text} ${sel.po}`)}>
                    + {sel.po}
                  </button>
                  <button className="insert mono" onClick={() => onEdit(`${text} ${sel.ref}`)}>
                    + {sel.ref}
                  </button>
                  <button className="insert mono" onClick={() => onEdit(`${text} ETA 30/JUL 14:00`)}>
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
