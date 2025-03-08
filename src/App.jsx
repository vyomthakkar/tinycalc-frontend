import React from 'react'
import Calculator from './components/Calculator'
import Header from './components/Header'
function App() {
  return (
    <div className="app">
      <header>
        <Header />
      </header>
      <main>
        <Calculator />
      </main>
      <footer>
      </footer>
    </div>
  )
}

export default App