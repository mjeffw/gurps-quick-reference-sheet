const parselink = GURPS.parselink
const handlePdf = GURPS.modules.Pdf.handlePdf

export default class GBQuickReferenceSheet extends GURPS.ActorSheets.character {
  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ['gb-quickref-sheet', 'sheet', 'actor'],
      width: 650,
      height: 850,
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

    data.pageref = foundry.utils.getProperty(this.actor, 'flags.gurps.pageref')
    data.copyright =
      foundry.utils.getProperty(this.actor, 'flags.gurps.copyright') ?? '©2024–2026 Gaming Ballistic, LLC'
    data.torso = this.actor.getTorsoDr()
    data.parryblock = this.actor.getEquippedParry()
    data.currentMove = this.actor.getCurrentMove()
    data.currentMoveMode = this.actor.getCurrentMoveMode()
    data.thrust = this.actor.system.thrust
    data.swing = this.actor.system.swing

    data.melee = this.getMeleeAttacks()
    data.ranged = this.getRangedAttacks()
    data.attacks = [...data.melee, ...data.ranged].sort((a, b) => a.nameUsage.localeCompare(b.nameUsage))

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

      case 'SB':
        data.cssClass = `${data.cssClass} saethor`
        break

      case 'WK':
        data.cssClass = `${data.cssClass} warlock`
        break

      case 'NB':
      default:
        data.cssClass = `${data.cssClass} bestiary`
        break
    }
    return data
  }

  getMeleeAttacks() {
    const results = []

    // Clone the melee object so we can null out entries without modifying the original data.
    const melee = JSON.parse(JSON.stringify(this.actor.system.melee))

    // Create an entry for every melee attack.
    for (const key of Object.keys(melee)) {
      const item = melee[key]
      if (item == null) continue

      const meleeData = {}

      meleeData.key = `system.melee.${key}`
      meleeData.name = item.name
      meleeData.usage = item?.mode ?? ''
      meleeData.level = item.level
      meleeData.cost = item.cost
      meleeData.damage = []

      if (item.parry && item.parry !== 'No') meleeData.parry = item.parry

      meleeData.notes = item.notes
      meleeData.nameUsage = meleeData.name + (!!meleeData.usage ? ` (${meleeData.usage})` : '')

      meleeData.damage.push({
        damage: item.damage,
        reach: item.reach,
        followup: item.followup,
        damagenotes: item.damagenotes,
        mode: meleeData.usage,
        nameUsage: meleeData.nameUsage,
      })

      // Check for other melee attacks with the same name, level, and notes, and if so, add their damage to this entry and null them out in the original array to avoid duplicates.
      for (const [otherKey, otherItem] of Object.entries(melee)) {
        if (
          otherItem != null &&
          otherKey !== key &&
          otherItem.name === meleeData.name &&
          otherItem.level === meleeData.level &&
          otherItem.notes === meleeData.notes
        ) {
          meleeData.damage.push({
            damage: otherItem.damage,
            reach: otherItem.reach,
            followup: otherItem.followup,
            damagenotes: otherItem.damagenotes,
            mode: otherItem?.mode ?? '',
            nameUsage: meleeData.name + (!!otherItem?.mode ? ` (${otherItem.mode})` : ''),
          })

          melee[otherKey] = null
        }
      }

      results.push(meleeData)
    }

    return results
  }

  getRangedAttacks() {
    const results = []

    // Clone the melee object so we can null out entries without modifying the original data.
    const ranged = JSON.parse(JSON.stringify(this.actor.system.ranged))

    // Create an entry for every melee attack.
    for (const key of Object.keys(ranged)) {
      const item = ranged[key]
      if (item == null) continue

      const rangedData = this.createRangedData(item)
      rangedData.key = `system.ranged.${key}`
      rangedData.nameUsage = rangedData.name + (!!rangedData.mode ? ` (${rangedData.mode})` : '')

      // If damage looks like <damage>/<number>point<s> then set damage to <damage> and cost to <number>.
      const regex = /(?<damage>.*?)\/(?<points>\d+)?\s*point(?:s)?/
      if (item.damage && item.damage.toString().match(regex)) {
        const accummulator = this.convertToDamageAccum(item, regex)
        rangedData.damagecomponent[0].damage = accummulator.damage
        rangedData.cost = accummulator.cost
      }

      for (const [otherKey, otherItem] of Object.entries(ranged)) {
        if (otherItem != null && otherKey !== key && this.isValidRangedToMerge(rangedData, otherItem)) {
          rangedData.damagecomponent.push({
            damage: otherItem.damage,
            followup: otherItem.followup,
            damagenotes: otherItem.damagenotes,
            nameUsage: rangedData.name + (!!otherItem?.mode ? ` (${otherItem.mode})` : ''),
          })

          ranged[otherKey] = null
        }
      }

      results.push(rangedData)
    }

    return results
  }

  isValidRangedToMerge(rangedData, otherItem) {
    return (
      rangedData.name === otherItem.name &&
      rangedData.level === otherItem.level &&
      rangedData.notes === otherItem.notes &&
      rangedData.acc === otherItem.acc &&
      rangedData.bulk === otherItem.bulk &&
      rangedData.range === otherItem.range &&
      rangedData.shots === otherItem.shots &&
      rangedData.rcl === otherItem.rcl &&
      rangedData.cost === otherItem.cost
    )
  }

  createRangedData(ranged) {
    return {
      name: ranged.name,
      level: ranged.level,
      notes: ranged.notes,
      acc: ranged.acc,
      bulk: ranged.bulk,
      range: ranged.range,
      shots: ranged.shots,
      rcl: ranged.rcl,
      cost: ranged.cost,
      mode: ranged.mode,
      damagecomponent: [
        {
          damage: ranged.damage,
          followup: ranged.followup,
          damagenotes: ranged.damagenotes,
        },
      ],
    }
  }

  convertToDamageAccum(ranged, regex) {
    const groups = ranged.damage.toString().match(regex).groups
    return { damage: `+${groups.damage}`, cost: +(groups.points || 1) }
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
