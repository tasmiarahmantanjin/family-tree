import { FC } from 'react'
import Header from '@/components/Header'
import PersonForm from '@/components/PersonForm'
import RelationshipManager from '@/components/RelationshipManager'
import FamilyTree from '@/components/FamilyTree'

const Home: FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 overflow-x-hidden">
      <Header />

      <main className="py-6 sm:py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid gap-4 sm:gap-5 lg:gap-6 lg:grid-cols-4">
            <div className="lg:col-span-1 space-y-4 min-w-0">
              <PersonForm />
              <RelationshipManager />
            </div>

            <div className="lg:col-span-3 min-w-0">
              <FamilyTree />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default Home
