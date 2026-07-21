import './style.css'
import { GameApp } from './game/app.ts'

const root = document.querySelector<HTMLElement>('#app')
if (!root) {
  throw new Error('#app root missing')
}

new GameApp(root)
