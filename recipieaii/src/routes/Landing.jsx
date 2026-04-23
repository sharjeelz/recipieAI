import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet'

export default function Landing() {
  return (
    <div className="bg-white text-gray-800">
      <Helmet>
        <title>RecipyAI — Turn YouTube Cooking Videos into Recipes</title>
        <meta
          name="description"
          content="RecipyAI converts YouTube cooking videos into step-by-step recipes you can save, download, and share."
        />
      </Helmet>

      <section className="bg-gradient-to-br from-emerald-400 to-emerald-600 text-white py-20 px-6 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold mb-4">RecipyAI 🍳</h1>
        <p className="text-lg sm:text-xl mb-8 max-w-2xl mx-auto">
          Convert YouTube cooking videos into step-by-step recipes you can save, download, and share.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
          <Link
            to="/register"
            className="inline-flex items-center justify-center rounded-lg bg-white text-emerald-700 font-semibold px-6 py-3 min-h-[44px] w-full sm:w-auto shadow hover:bg-emerald-50"
          >
            Get started
          </Link>
          <Link
            to="/login"
            className="inline-flex items-center justify-center rounded-lg border border-white/60 text-white font-semibold px-6 py-3 min-h-[44px] w-full sm:w-auto hover:bg-white/10"
          >
            Sign in
          </Link>
        </div>
      </section>

      <section className="py-16 bg-gray-50 px-6">
        <h2 className="text-3xl font-bold mb-10 text-center">How it works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <Card title="📹 Paste a link">
            Paste any YouTube cooking video URL into the app.
          </Card>
          <Card title="🧠 AI extracts">
            RecipyAI reads the transcript and a top LLM structures it into a recipe.
          </Card>
          <Card title="📖 Save & share">
            Keep recipes in your library, share a link with friends, or download them.
          </Card>
        </div>
      </section>

      <section className="py-16 bg-emerald-50 px-6 text-center">
        <h2 className="text-2xl sm:text-3xl font-bold mb-4">What users say</h2>
        <blockquote className="italic text-lg max-w-2xl mx-auto">
          "Finally, a smart way to save recipes without typing. I use RecipyAI after every
          cooking video."
        </blockquote>
        <p className="text-gray-700 mt-2">— Aisha R., Food Blogger</p>
      </section>

      <footer className="text-center py-8 text-sm text-gray-500">
        &copy; 2026 RecipyAI. Built with ❤️ for food lovers.
      </footer>
    </div>
  )
}

function Card({ title, children }) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm">
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-gray-600">{children}</p>
    </div>
  )
}
