import { useEffect, useMemo, useRef, useState } from 'react'
import defaultWords from './words.json'

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key)
      return raw ? JSON.parse(raw) : initialValue
    } catch {
      return initialValue
    }
  })
  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value))
  }, [key, value])
  return [value, setValue]
}

export default function App() {
  const [customSet, setCustomSet] = useLocalStorage('fc_custom_words', null)
  const [known, setKnown] = useLocalStorage('fc_known', 0)
  const [unknown, setUnknown] = useLocalStorage('fc_unknown', 0)
  const [showTranslation, setShowTranslation] = useState(false)
  const fileRef = useRef(null)

  const [dark, setDark] = useLocalStorage('fc_dark', false)
  useEffect(() => {
    document.body.classList.toggle('dark', dark)
    document.body.classList.toggle('light', !dark)
  }, [dark])

  const wordsBase = useMemo(() => {
    const base = customSet && Array.isArray(customSet) && customSet.length ? customSet : defaultWords
    return base
  }, [customSet])

  const [queue, setQueue] = useState(() => [])
  useEffect(() => {
    setQueue(shuffle(wordsBase))
    setShowTranslation(false)
  }, [wordsBase])

  const current = queue[0]

  function nextCard() {
    setShowTranslation(false)
    setQueue(q => {
      if (q.length <= 1) return q
      const [first, ...rest] = q
      return [...rest, first]
    })
  }

  function handleAnswer(yes) {
    if (!current) return
    if (yes) {
      setKnown(v => v + 1)
      setQueue(q => q.slice(1)) 
    } else {
      setUnknown(v => v + 1)
      setQueue(q => {
        const [first, ...rest] = q
        const insertAfter = Math.min(4, rest.length)
        const newQ = [...rest]
        newQ.splice(insertAfter, 0, first)
        return newQ
      })
    }
    setShowTranslation(false)
  }

  function resetProgress() {
    setKnown(0)
    setUnknown(0)
    setQueue(shuffle(wordsBase))
    setShowTranslation(false)
  }

  function onUploadFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result)
        if (!Array.isArray(data)) throw new Error('Not an array')
        const normalized = data
          .map(it => {
            if (typeof it === 'string') {
              const [en, he] = it.split(',').map(s => s.trim())
              return { en, he }
            }
            return { en: it.en, he: it.he }
          })
          .filter(it => it.en && it.he)
        if (!normalized.length) throw new Error('Empty list')
        setCustomSet(normalized)
        setQueue(shuffle(normalized))
        setShowTranslation(false)
        alert('מאגר הוטען בהצלחה!')
      } catch (err) {
        alert('קובץ לא חוקי. צריך JSON עם אובייקטים {en, he} או מערך של "en,he" בשורה.')
      }
    }
    reader.readAsText(file, 'utf-8')
    e.target.value = ''
  }

  function clearCustom() {
    setCustomSet(null)
    setQueue(shuffle(defaultWords))
    setShowTranslation(false)
  }

  const total = known + unknown
  const successRate = total ? Math.round((known / total) * 100) : 0

  return (
    <div className="container">
      <div className="app">
        <h1 className="title">כרטיסיות מילים</h1>

        <div className="stats">
          <div>✅ הכרתי: {known}</div>
          <div>❌ לא הכרתי: {unknown}</div>
          <div>📊 הצלחה: {successRate}%</div>
        </div>

        {current ? (
          <div className="card" onClick={() => setShowTranslation(v => !v)}>
            <div className="term">{showTranslation ? current.he : current.en}</div>
            <div className="hint">{showTranslation ? 'לחיצה תסתיר' : 'לחיצה תציג תרגום'}</div>
          </div>
        ) : (
          <div className="card">
            <div className="term">נגמרו הכרטיסיות! 🎉</div>
            <div className="hint">לחץ איפוס כדי להתחיל סשן חדש</div>
          </div>
        )}

        {current && showTranslation && (
          <div className="actions">
            <button className="btn" onClick={() => handleAnswer(true)}>הכרתי</button>
            <button className="btn danger" onClick={() => handleAnswer(false)}>לא הכרתי</button>
          </div>
        )}

        <div className="toolbar">
          <button className="btn secondary" onClick={nextCard}>דלג ⏭</button>
          <button className="btn secondary" onClick={resetProgress}>איפוס סטטיסטיקות ♻️</button>
          <button className="btn secondary" onClick={() => setDark(d => !d)}>
            {dark ? '☀️ מצב יום' : '🌙 מצב לילה'}
          </button>
        </div>
      </div>
    </div>
  )
}
