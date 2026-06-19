import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { Check, Copy, Download, Link2, QrCode } from 'lucide-react'
import PageHeader from '../components/PageHeader'

export default function SharePage() {
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [copied, setCopied] = useState(false)
  const voteUrl = `${window.location.origin}/`

  useEffect(() => {
    QRCode.toDataURL(voteUrl, {
      width: 720,
      margin: 2,
      color: { dark: '#16392f', light: '#ffffff' },
      errorCorrectionLevel: 'H',
    }).then(setQrDataUrl)
  }, [voteUrl])

  const copyLink = async () => {
    await navigator.clipboard.writeText(voteUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  return (
    <section className="page share-page">
      <PageHeader eyebrow="扫码即投" title="邀请同学参与" description="无需注册，打开链接就能匿名评价。" />

      <div className="share-card">
        <div className="qr-frame">
          <div className="qr-corner corner-1" />
          <div className="qr-corner corner-2" />
          <div className="qr-corner corner-3" />
          <div className="qr-corner corner-4" />
          {qrDataUrl ? <img src={qrDataUrl} alt="投票页面二维码" /> : <QrCode size={80} />}
          <div className="qr-badge">班级评议</div>
        </div>
        <h2>扫一扫，匿名投票</h2>
        <p>建议将二维码分享到班级群或打印张贴</p>

        <div className="link-box">
          <Link2 size={18} />
          <span>{voteUrl}</span>
          <button type="button" onClick={copyLink} aria-label="复制链接">
            {copied ? <Check size={18} /> : <Copy size={18} />}
          </button>
        </div>

        <div className="share-actions">
          <button className="button secondary" type="button" onClick={copyLink}>
            {copied ? <Check size={18} /> : <Copy size={18} />} {copied ? '已复制' : '复制链接'}
          </button>
          <a className="button primary" href={qrDataUrl} download="班干部匿名评议二维码.png">
            <Download size={18} /> 下载二维码
          </a>
        </div>
      </div>

      <div className="tip-card">
        <span>小贴士</span>
        <p>二维码会自动指向当前网站的投票首页。部署到 Vercel 后，无需重新改代码，打开分享页下载即可。</p>
      </div>
    </section>
  )
}
