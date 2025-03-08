import React from 'react'
import Calculator from './components/Calculator'
import Header from './components/Header'
function App() {
  return (
    <div className="app bg-gray-950 min-h-screen">
      <header>
        <Header />
      </header>
      <main className='container mx-auto py-8'>
        <Calculator />
      </main>
      <footer>
      </footer>
    </div>
  )
}

export default App