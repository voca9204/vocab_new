'use client'

import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui'
import { Copy, Check, BarChart3 } from 'lucide-react'

interface ExamShareModalProps {
  isOpen: boolean
  onClose: () => void
  examId: string | null
  title: string
}

export function ExamShareModal({ isOpen, onClose, examId, title }: ExamShareModalProps) {
  const [qr, setQr] = useState<string>('')
  const [copied, setCopied] = useState(false)

  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const takeUrl = examId ? `${origin}/exam/take/${examId}` : ''
  const resultsUrl = examId ? `/study/exam/${examId}/results` : ''

  useEffect(() => {
    if (!takeUrl) return
    QRCode.toDataURL(takeUrl, { width: 240, margin: 1 })
      .then(setQr)
      .catch(() => setQr(''))
  }, [takeUrl])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(takeUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* ignore */
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-md">
      <div className="p-6">
        <h2 className="text-lg font-bold mb-1">시험 공유</h2>
        <p className="text-sm text-gray-600 mb-4">{title}</p>

        {!examId ? (
          <p className="text-sm text-gray-500">시험을 생성하는 중…</p>
        ) : (
          <>
            <div className="flex justify-center mb-4">
              {qr ? (
                <img src={qr} alt="시험 QR 코드" className="w-48 h-48" />
              ) : (
                <div className="w-48 h-48 bg-gray-100 rounded-lg animate-pulse" />
              )}
            </div>

            <p className="text-xs text-gray-500 mb-1">응시 링크 (로그인 없이 이름만 입력하면 응시)</p>
            <div className="flex gap-2 mb-4">
              <input
                readOnly
                value={takeUrl}
                className="flex-1 text-sm px-3 py-2 border rounded-lg bg-gray-50 truncate"
                onFocus={(e) => e.currentTarget.select()}
              />
              <Button variant="outline" onClick={copy} className="shrink-0">
                {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => window.open(resultsUrl, '_blank')}>
                <BarChart3 className="h-4 w-4 mr-2" /> 결과 보기
              </Button>
              <Button className="flex-1" onClick={onClose}>
                닫기
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
