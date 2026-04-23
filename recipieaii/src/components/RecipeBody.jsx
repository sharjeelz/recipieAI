import { useState } from 'react'
import { scaleQuantity } from '../lib/quantity'

export default function RecipeBody({ recipe }) {
  const baseServings = recipe.servings || null
  const [servings, setServings] = useState(baseServings)
  const scale = baseServings && servings ? servings / baseServings : 1
  const scaled = scale !== 1

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-gray-900">{recipe.title}</h1>
        {recipe.summary && <p className="text-gray-600 mt-2">{recipe.summary}</p>}
        <div className="flex flex-wrap gap-2 mt-3 text-sm text-gray-600">
          {recipe.servings != null && (
            <Pill>🍽️ {recipe.servings} serving{recipe.servings === 1 ? '' : 's'}</Pill>
          )}
          {recipe.total_time_min != null && <Pill>⏱️ {recipe.total_time_min} min</Pill>}
          {recipe.cuisine && <Pill className="capitalize">{recipe.cuisine}</Pill>}
          {recipe.cost_usd != null && (
            <Pill className="bg-emerald-50 text-emerald-800" title={costTooltip(recipe)}>
              ≈ {formatCost(recipe.cost_usd)}
            </Pill>
          )}
        </div>
        {recipe.source_url && (
          <a
            href={recipe.source_url}
            target="_blank"
            rel="noreferrer"
            className="inline-block mt-3 text-sm text-emerald-700 hover:underline"
          >
            Source video ↗
          </a>
        )}
      </header>

      <section>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <h2 className="text-xl font-semibold">Ingredients</h2>
          {baseServings != null && (
            <ServingsScaler
              base={baseServings}
              value={servings}
              onChange={setServings}
            />
          )}
        </div>
        <ul className="space-y-1.5">
          {recipe.ingredients.map((ing) => (
            <li key={`${ing.position}-${ing.item}`} className="flex gap-3">
              <span className="text-gray-900 min-w-[80px] tabular-nums">
                {[scaled ? scaleQuantity(ing.quantity, scale) : ing.quantity, ing.unit]
                  .filter(Boolean)
                  .join(' ') || ''}
              </span>
              <span className="text-gray-800 flex-1">
                {ing.item}
                {ing.notes && <span className="text-gray-500"> — {ing.notes}</span>}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">Steps</h2>
        <ol className="space-y-3">
          {recipe.steps.map((s) => (
            <li key={`${s.position}`} className="flex gap-3">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 font-semibold flex items-center justify-center text-sm">
                {s.position + 1}
              </span>
              <p className="text-gray-800 flex-1">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {recipe.tips && recipe.tips.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-3">💡 Tips</h2>
          <ul className="space-y-2 bg-amber-50 border border-amber-200 rounded-lg p-4">
            {recipe.tips.map((tip, i) => (
              <li key={i} className="text-amber-900 flex gap-2">
                <span className="text-amber-600 flex-shrink-0">•</span>
                <span className="flex-1">{tip}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

function ServingsScaler({ base, value, onChange }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-gray-500">Servings</span>
      <button
        type="button"
        onClick={() => onChange(Math.max(1, value - 1))}
        className="w-8 h-8 rounded-full border border-gray-300 hover:border-emerald-500 flex items-center justify-center"
        aria-label="Decrease servings"
      >
        −
      </button>
      <span className="min-w-[2ch] text-center font-semibold text-gray-900">{value}</span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        className="w-8 h-8 rounded-full border border-gray-300 hover:border-emerald-500 flex items-center justify-center"
        aria-label="Increase servings"
      >
        +
      </button>
      {value !== base && (
        <button
          type="button"
          onClick={() => onChange(base)}
          className="text-xs text-emerald-700 hover:underline ml-1"
        >
          Reset
        </button>
      )}
    </div>
  )
}

function Pill({ children, className = '', title }) {
  return (
    <span
      className={`inline-flex items-center bg-gray-100 rounded-full px-3 py-1 ${className}`}
      title={title}
    >
      {children}
    </span>
  )
}

function formatCost(usd) {
  if (usd < 0.01) return `$${usd.toFixed(4)}`
  if (usd < 1) return `$${usd.toFixed(3)}`
  return `$${usd.toFixed(2)}`
}

function costTooltip(recipe) {
  const parts = []
  if (recipe.llm_model) parts.push(`Model: ${recipe.llm_model}`)
  if (recipe.llm_input_tokens != null)
    parts.push(`Tokens in: ${recipe.llm_input_tokens.toLocaleString()}`)
  if (recipe.llm_output_tokens != null)
    parts.push(`Tokens out: ${recipe.llm_output_tokens.toLocaleString()}`)
  if (recipe.transcribe_seconds != null)
    parts.push(`Audio: ${Math.round(recipe.transcribe_seconds)}s`)
  return parts.join(' · ')
}
