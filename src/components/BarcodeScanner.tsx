import { useEffect, useRef, useState } from 'react'
import { Button, Sheet } from './ui'

/**
 * Scans EAN/UPC barcodes from the rear camera. ZXing is pulled in on demand so the
 * scanner's weight only lands on people who actually open it.
 */
export function BarcodeScanner({
  onDetected,
  onClose,
}: {
  onDetected: (barcode: string) => void
  onClose: () => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const handlerRef = useRef(onDetected)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    handlerRef.current = onDetected
  }, [onDetected])

  useEffect(() => {
    let controls: { stop: () => void } | undefined
    let stopped = false

    void (async () => {
      try {
        const { BrowserMultiFormatReader } = await import('@zxing/browser')
        const video = videoRef.current
        if (!video) return
        const reader = new BrowserMultiFormatReader()
        controls = await reader.decodeFromVideoDevice(undefined, video, (result) => {
          if (stopped || !result) return
          stopped = true
          controls?.stop()
          handlerRef.current(result.getText())
        })
        if (stopped) controls.stop()
      } catch {
        setError('No camera to scan with. Allow camera access for this site, or add the food by hand.')
      }
    })()

    return () => {
      stopped = true
      controls?.stop()
    }
  }, [])

  return (
    <Sheet open title="Scan a barcode" onClose={onClose}>
      {error ? (
        <p className="text-sm text-steel">{error}</p>
      ) : (
        <>
          <div className="relative overflow-hidden rounded-[3px] border-2 border-iron bg-iron">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="block h-64 w-full object-cover"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-6 top-1/2 h-0.5 -translate-y-1/2 bg-plate-red"
            />
          </div>
          <p className="mt-3 text-sm text-steel">
            Hold the barcode across the red line. It scans on its own once it reads.
          </p>
        </>
      )}
      <Button variant="secondary" className="mt-4 w-full" onClick={onClose}>
        Cancel
      </Button>
    </Sheet>
  )
}
