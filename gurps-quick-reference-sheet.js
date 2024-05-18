import init from './scripts/init.js'

Hooks.once('gurpsinit', async function (theGURPS) {
  console.log('Loading GURPS Quick Reference Sheet')
  await init('gurps-quick-reference-sheet')
  Hooks.call('gurps-quick-reference-sheet-init', theGURPS)
})
