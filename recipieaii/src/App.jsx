import { Routes, Route, Navigate } from 'react-router-dom'
import AppShell from './components/AppShell'
import RequireAuth from './components/RequireAuth'
import Landing from './routes/Landing'
import Login from './routes/Login'
import Register from './routes/Register'
import AppHome from './routes/AppHome'
import Library from './routes/Library'
import JobStatus from './routes/JobStatus'
import RecipeView from './routes/RecipeView'
import ShoppingList from './routes/ShoppingList'
import Share from './routes/Share'
import NotFound from './routes/NotFound'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/s/:token" element={<Share />} />

      <Route
        path="/app"
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route index element={<AppHome />} />
        <Route path="library" element={<Library />} />
        <Route path="shopping-list" element={<ShoppingList />} />
        <Route path="jobs/:jobId" element={<JobStatus />} />
        <Route path="recipes/:recipeId" element={<RecipeView />} />
      </Route>

      <Route path="/home" element={<Navigate to="/" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
