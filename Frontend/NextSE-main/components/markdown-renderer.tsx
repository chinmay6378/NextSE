'use client'

import ReactMarkdown from 'react-markdown'

interface TableData {
  headers: string[]
  rows: string[][]
}

function parseRow(line: string): string[] {
  return line
    .split('|')
    .filter((_, i, arr) => i > 0 && i < arr.length - 1)
    .map(cell => cell.trim())
}

function parseMarkdownTable(lines: string[]): TableData | null {
  if (lines.length < 3) return null
  if (!/^\|[\s\-:|]+\|/.test(lines[1])) return null
  return {
    headers: parseRow(lines[0]),
    rows: lines.slice(2).map(parseRow),
  }
}

function MarkdownTable({ data }: { data: TableData }) {
  return (
    <div className="overflow-x-auto my-4">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            {data.headers.map((h, i) => (
              <th
                key={i}
                className="border border-border bg-muted/50 px-3 py-2 text-left font-semibold text-foreground whitespace-nowrap"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row, ri) => (
            <tr key={ri} className={ri % 2 === 0 ? '' : 'bg-muted/20'}>
              {row.map((cell, ci) => (
                <td key={ci} className="border border-border px-3 py-2 text-muted-foreground align-top">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

type Segment =
  | { type: 'text'; content: string }
  | { type: 'table'; data: TableData }

function splitSegments(markdown: string): Segment[] {
  const segments: Segment[] = []
  const lines = markdown.split('\n')
  let i = 0
  const textBuf: string[] = []

  const flushText = () => {
    const text = textBuf.join('\n').trim()
    if (text) segments.push({ type: 'text', content: text })
    textBuf.length = 0
  }

  while (i < lines.length) {
    if (lines[i].trimStart().startsWith('|')) {
      const tableLines: string[] = []
      while (i < lines.length && lines[i].trimStart().startsWith('|')) {
        tableLines.push(lines[i])
        i++
      }
      const data = parseMarkdownTable(tableLines)
      if (data) {
        flushText()
        segments.push({ type: 'table', data })
      } else {
        textBuf.push(...tableLines)
      }
    } else {
      textBuf.push(lines[i])
      i++
    }
  }
  flushText()
  return segments
}

interface MarkdownRendererProps {
  children: string
  className?: string
}

export function MarkdownRenderer({ children, className }: MarkdownRendererProps) {
  const segments = splitSegments(children)
  return (
    <div className={className}>
      {segments.map((seg, idx) =>
        seg.type === 'table' ? (
          <MarkdownTable key={idx} data={seg.data} />
        ) : (
          <ReactMarkdown key={idx}>{seg.content}</ReactMarkdown>
        )
      )}
    </div>
  )
}
