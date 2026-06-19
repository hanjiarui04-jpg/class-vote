import { Star } from 'lucide-react'

export default function StarRating({ value, onChange, readonly = false, size = 30 }) {
  return (
    <div className="star-row" aria-label={`${value || 0} 星`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          type="button"
          key={star}
          className={star <= value ? 'star active' : 'star'}
          onClick={() => !readonly && onChange(star)}
          disabled={readonly}
          aria-label={`${star} 星`}
        >
          <Star size={size} fill={star <= value ? 'currentColor' : 'none'} strokeWidth={1.8} />
        </button>
      ))}
    </div>
  )
}
