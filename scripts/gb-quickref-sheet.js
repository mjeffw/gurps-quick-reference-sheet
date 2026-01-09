const parselink = GURPS.parselink
const handlePdf = GURPS.modules.Pdf.handlePdf

export default class GBQuickReferenceSheet extends GURPS.ActorSheets.character {
  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ['gb-quickref-sheet', 'sheet', 'actor'],
      width: 590,
      height: 800,
      dragDrop: [{ dragSelector: '.item-list .item', dropSelector: null }],
    })
  }

  /* -------------------------------------------- */

  /** @override */
  get template() {
    return `/modules/gurps-quick-reference-sheet/templates/gb-quickref-sheet.hbs`
  }

  getData() {
    const data = super.getData()

    console.log('GBQuickReferenceSheet.getData', data)

    data.pageref = foundry.utils.getProperty(this.actor, 'flags.gurps.pageref')
    data.copyright =
      foundry.utils.getProperty(this.actor, 'flags.gurps.copyright') ?? '©2024–2026 Gaming Ballistic, LLC'
    data.torso = this.actor.getTorsoDr()
    data.parryblock = this.actor.getEquippedParry()
    data.currentMove = this.actor.getCurrentMove()
    data.currentMoveMode = this.actor.getCurrentMoveMode()

    switch (foundry.utils.getProperty(this.actor, 'flags.gurps.book')) {
      case 'NBB':
        data.cssClass = `${data.cssClass} bugstiary`
        break

      case 'NBG':
        data.cssClass = `${data.cssClass} garden`
        break

      case 'NBS':
        data.cssClass = `${data.cssClass} snakes`
        break

      case 'NB':
        data.cssClass = `${data.cssClass} bestiary`
        break

      case 'SB':
        data.cssClass = `${data.cssClass} saethor`
        break

      case 'WK':
        data.cssClass = `${data.cssClass} warlock`
        break
    }
    return data
  }

  getCustomHeaderButtons() {
    return []
  }

  get gurpsActorData() {
    return this.actor.getGurpsActorData()
  }

  /**
   * @returns {Array<{mode: string, value: number, default: boolean}>}
   * 
   * Returns an array of move objects, each with a mode (GROUND, AIR, WATER, SPACE, UNDERGROUND, etc), a value (number
   * of yards per turn), and an optional default (boolean). If default = true, this is the value used in the 
   * Encumbrance table that displays adjusted move.
   * 
   * It sources its data from either a `system.move` object, if it exists, or directly from `system.basicmove.value`. 
   * `system.move` should be used when there are multiple movement modes, or when Ground move is not present at all, or 
   * when actual move per turn is different from basicmove, as when the actor has the Enhanced Move advantage.

   * The modes are also such that we can replace them with 'GURPS.move${mode}' to derive an i18n language key to get
   * a label for display (e.g., 'GURPS.moveGROUND'). If no such i18n key exists, the label uses the mode without
   * translation.
   */
  // _getMove() {
  //   return this.gurpsActorData.move ?? [{ mode: 'GROUND', value: gurpsActorData.basicmove.value, default: true }]
  // }

  activateListeners(html) {
    super.activateListeners(html)

    document
      .querySelector('.gb-quick-reference')
      .style.setProperty('--labelAcc', `"${game.i18n.localize('GURPS.acc')} "`)
    document
      .querySelector('.gb-quick-reference')
      .style.setProperty('--labelBulk', `"${game.i18n.localize('GURPS.bulk')} "`)
    document.querySelector('.gb-quick-reference').click(ev => {
      this._onfocus(ev)
    })

    html.find('.rollableicon').click(this._onClickRollableIcon.bind(this))
    html.find('.gb-move').click(this._onClickMove.bind(this))
    html.find('.gb-link').click(this._handleOnPdfLink.bind(this))

    // ============================
    // ============================
  }

  async _onClickRollableIcon(ev) {
    ev.preventDefault()
    const element = ev.currentTarget
    const val = element.dataset.value
    const parsed = parselink(val)
    GURPS.performAction(parsed.action, this.actor, ev)
  }

  _onClickMove(event) {
    event.preventDefault()
    const value = event.currentTarget.dataset.key
    this.actor.setMoveDefault(value)
  }

  _handleOnPdfLink(event) {
    const prefix = foundry.utils.getProperty(this.actor, 'flags.gurps.book')
    handlePdf(prefix + event.currentTarget.innerText)
  }
}
