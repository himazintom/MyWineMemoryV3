import { useRef, useState, useEffect } from 'react'
import type { MouseEvent, TouchEvent } from 'react'
import Button from '../common/Button'

interface DrawingCanvasProps {
  width?: number
  height?: number
  onSave?: (imageData: string) => void
  initialImage?: string
}

interface Point {
  x: number
  y: number
}

export default function DrawingCanvas({ 
  width = 600, 
  height = 400, 
  onSave,
  initialImage 
}: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentTool, setCurrentTool] = useState<'pen' | 'eraser'>('pen')
  const [brushSize, setBrushSize] = useState(3)
  const [brushColor, setBrushColor] = useState('#000000')
  const [history, setHistory] = useState<ImageData[]>([])
  const [historyStep, setHistoryStep] = useState(-1)

  // Canvas初期化
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // 背景を白に設定
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)

    // 初期画像があれば読み込み
    if (initialImage) {
      const img = new Image()
      img.onload = () => {
        ctx.drawImage(img, 0, 0, width, height)
        saveToHistory()
      }
      img.src = initialImage
    } else {
      saveToHistory()
    }
  }, [width, height, initialImage])

  // 履歴に保存
  const saveToHistory = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const imageData = ctx.getImageData(0, 0, width, height)
    const newHistory = history.slice(0, historyStep + 1)
    newHistory.push(imageData)
    
    // 履歴は最大20件まで保持
    if (newHistory.length > 20) {
      newHistory.shift()
    }
    
    setHistory(newHistory)
    setHistoryStep(newHistory.length - 1)
  }

  // 座標取得
  const getCoordinates = (e: MouseEvent | TouchEvent): Point | null => {
    const canvas = canvasRef.current
    if (!canvas) return null

    const rect = canvas.getBoundingClientRect()
    
    if ('touches' in e) {
      if (e.touches.length === 0) return null
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      }
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      }
    }
  }

  // 描画開始
  const startDrawing = (e: MouseEvent | TouchEvent) => {
    const coords = getCoordinates(e)
    if (!coords) return

    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx) return

    setIsDrawing(true)
    
    ctx.beginPath()
    ctx.moveTo(coords.x, coords.y)
    
    // ツール設定
    if (currentTool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out'
    } else {
      ctx.globalCompositeOperation = 'source-over'
      ctx.strokeStyle = brushColor
    }
    
    ctx.lineWidth = brushSize
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }

  // 描画中
  const draw = (e: MouseEvent | TouchEvent) => {
    if (!isDrawing) return
    
    const coords = getCoordinates(e)
    if (!coords) return

    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx) return

    ctx.lineTo(coords.x, coords.y)
    ctx.stroke()
  }

  // 描画終了
  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false)
      saveToHistory()
    }
  }

  // クリア
  const clearCanvas = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx) return

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)
    saveToHistory()
  }

  // 元に戻す
  const undo = () => {
    if (historyStep > 0) {
      const canvas = canvasRef.current
      const ctx = canvas?.getContext('2d')
      if (!ctx) return

      const newStep = historyStep - 1
      ctx.putImageData(history[newStep], 0, 0)
      setHistoryStep(newStep)
    }
  }

  // やり直し
  const redo = () => {
    if (historyStep < history.length - 1) {
      const canvas = canvasRef.current
      const ctx = canvas?.getContext('2d')
      if (!ctx) return

      const newStep = historyStep + 1
      ctx.putImageData(history[newStep], 0, 0)
      setHistoryStep(newStep)
    }
  }

  // 保存
  const saveImage = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const imageData = canvas.toDataURL('image/png')
    
    if (onSave) {
      onSave(imageData)
    } else {
      // ダウンロード
      const link = document.createElement('a')
      link.download = `wine-sketch-${Date.now()}.png`
      link.href = imageData
      link.click()
    }
  }

  // プリセットカラー
  const presetColors = [
    '#000000', // 黒
    '#722F37', // ワインレッド
    '#8B0000', // ダークレッド
    '#FFD700', // ゴールド
    '#F5DEB3', // ウィート
    '#8B4513', // サドルブラウン
    '#228B22', // フォレストグリーン
    '#4B0082', // インディゴ
    '#808080', // グレー
    '#FF69B4'  // ホットピンク
  ]

  return (
    <div className="drawing-canvas-container">
      {/* ツールバー */}
      <div className="canvas-toolbar">
        <div className="tool-group">
          <label className="tool-label">ツール:</label>
          <div className="tool-buttons">
            <button
              className={`tool-btn ${currentTool === 'pen' ? 'active' : ''}`}
              onClick={() => setCurrentTool('pen')}
              title="ペン"
            >
              ✏️
            </button>
            <button
              className={`tool-btn ${currentTool === 'eraser' ? 'active' : ''}`}
              onClick={() => setCurrentTool('eraser')}
              title="消しゴム"
            >
              🧹
            </button>
          </div>
        </div>

        <div className="tool-group">
          <label className="tool-label">サイズ: {brushSize}px</label>
          <input
            type="range"
            min="1"
            max="20"
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
            className="size-slider"
          />
        </div>

        <div className="tool-group">
          <label className="tool-label">カラー:</label>
          <div className="color-picker">
            <input
              type="color"
              value={brushColor}
              onChange={(e) => setBrushColor(e.target.value)}
              className="color-input"
              disabled={currentTool === 'eraser'}
            />
            <div className="preset-colors">
              {presetColors.map((color) => (
                <button
                  key={color}
                  className={`color-preset ${brushColor === color ? 'active' : ''}`}
                  style={{ backgroundColor: color }}
                  onClick={() => setBrushColor(color)}
                  disabled={currentTool === 'eraser'}
                  title={color}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="tool-group">
          <div className="action-buttons">
            <Button
              variant="secondary"
              size="sm"
              onClick={undo}
              disabled={historyStep <= 0}
            >
              ↶ 戻す
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={redo}
              disabled={historyStep >= history.length - 1}
            >
              ↷ やり直し
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={clearCanvas}
            >
              🗑️ クリア
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={saveImage}
            >
              💾 保存
            </Button>
          </div>
        </div>
      </div>

      {/* キャンバス */}
      <div className="canvas-wrapper">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="drawing-canvas"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          style={{ cursor: currentTool === 'pen' ? 'crosshair' : 'grab' }}
        />
      </div>

      {/* ステータスバー */}
      <div className="canvas-status">
        <span className="status-item">
          サイズ: {width} × {height}px
        </span>
        <span className="status-item">
          ツール: {currentTool === 'pen' ? 'ペン' : '消しゴム'}
        </span>
        <span className="status-item">
          履歴: {historyStep + 1}/{history.length}
        </span>
      </div>
    </div>
  )
}