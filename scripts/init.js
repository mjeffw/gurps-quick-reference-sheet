export default async function init(module) {
  Handlebars.registerHelper('gb-version', function () {
    return version === '%%version%%' ? 'DEV' : version
  })

  Handlebars.registerHelper('gb-entries', function (map) {
    return map ? Object.values(map) : []
  })

  Handlebars.registerHelper('gb-mergeLists', function (a, b) {
    return [...a, ...b]
  })

  Handlebars.registerHelper('gb-sort', function (list, options) {
    let sortfield = options.hash?.sortfield
    list.sort((a, b) => a[sortfield].localeCompare(b[sortfield]))
    return list
  })

  Handlebars.registerHelper('gb-round', function (text) {
    let value = typeof text === 'number' ? text : parseFloat(text)
    value = Math.round(value * 100) / 100
    return value === 0 ? 0 : value
  })

  // TODO Can be replaced with the "tracker" helper from the GURPS system after it is updated.
  Handlebars.registerHelper('gb-tracker', function (data, trackerName) {
    if (!!data && !!data.additionalresources?.tracker) {
      // find the tracker with name
      let tracker = Object.values(data.additionalresources?.tracker).find(it => it.name === trackerName)
      if (tracker) {
        let found = Object.keys(data.additionalresources.tracker).find(
          it => data.additionalresources.tracker[it].name === trackerName
        )
        tracker.key = found
        return tracker
      }
    }
    return null
  })

  Handlebars.registerHelper('printRangedAttack', function (attack) {
    return printRangedAttack(attack)
  })

  Handlebars.registerHelper('printMeleeAttack', function (attack) {
    return printMeleeAttack(attack)
  })

  function printRangedAttack(attack) {
    const levelSpan = !attack.level ? '' : `<span> (${attack.level})</span>`
    const nameSpan = `<span class='gb-name rollable' 
       data-name='${attack.nameUsage}' 
       data-key='${attack.key}'
       data-otf='R:"${attack.nameUsage}"'>${attack.name}${levelSpan}</span>`
    const usageSpan = !attack.usage ? '' : `<span class='usage'> (${attack.usage})</span>`

    // Output damage.
    let damageOutputArray = []
    for (const component of attack.damagecomponent) {
      const damageArray = Array.isArray(component.damage) ? component.damage : [component.damage]
      const damageText = damageArray.join(' and ')
      const damageSpan = `<span class='gb-damage rollable' data-damage data-otf='D:"${component.nameUsage}"'>${damageText}</span>`
      // TODO: It would be nice to ask the user which energy pool to use when clicking on the damage.
      const costSpan = !!component.cost ? `per ${component.cost} energy` : ''
      damageOutputArray.push(`${damageSpan}${!!costSpan ? ` (${costSpan})` : ''}`)
    }

    const damageOutput = damageOutputArray.join('<em> or </em>') + '.'

    const rangeSpan = `<span class='gb-reach'>Range ${attack.range}${!attack.halfd ? '' : attack.halfd}</span>`
    const accuracySpan = !!attack.acc
      ? `<span class='gb-penalty gmod acc' data-name='Accuracy' data-otf='${displayNumber(attack.acc)} Accuracy'
      >${displayNumber(attack.acc, { showPlus: false })}</span>`
      : ''

    let output = `${nameSpan}${usageSpan}: ${damageOutput} ${rangeSpan}. ${accuracySpan}`

    if (!!attack.shots || !!attack.bulk) {
      if (!!attack.shots) output += `, <span class='gb-reach'>Shots ${attack.shots}</span>`

      if (!!attack.bulk)
        output += `, <span class='gb-penalty gmod bulk' data-name='Bulk' data-otf='${attack.bulk} to hit for Bulk'>${displayNumber(attack.bulk)}</span>`
    }
    output += `.`

    if (!!attack.notes) {
      output += ` <span class='gb-notes'>${gurpslink(attack.notes)}</span>`
      if (!output.endsWith('.')) output += `.`
    }
    return output
  }

  /* ----------------------------------------- */

  function printMeleeAttack(attack) {
    const nameSpan = attack.level
      ? span(`${attack.name} (${span(attack.level)})`, {
          class: 'gb-name rollable',
          data: { name: attack.nameUsage, key: attack.key, otf: `M:"${attack.nameUsage}"` },
        })
      : span(attack.name, { class: 'gb-name' })

    const damageOutputArray = []
    for (const component of attack.damagecomponent) {
      const usageSpan = component.usage ? span(` ${component.usage} `, { class: 'usage' }) : ''

      const damageArray = Array.isArray(component.damage) ? component.damage : [component.damage]
      const damageText = damageArray.join(' and ')
      const damageSpan = span(damageText, {
        class: 'gb-damage rollable',
        data: { damage: '', otf: `D:"${component.nameUsage}"` },
      })
      const costSpan = !!component.cost ? ` per ${component.cost} energy` : ''
      const followupSpan = !!component.followup ? span(` plus ${component.followup} follow-up,`) : ''
      const reachSpan = !!component.reach ? ` Reach ${span(component.reach, { class: 'gb-reach' })}` : ''

      damageOutputArray.push(`${usageSpan}${damageSpan}${costSpan}${followupSpan}${reachSpan}`)
    }

    const damageOutput = damageOutputArray.join('<em> or </em>') + '. '

    const parrySpan = !!attack.parry
      ? span(`Parry ${attack.parry}.`, {
          class: 'gb-damage rollable',
          data: { otf: `P:${attack.nameUsage} Parry` },
        })
      : ''

    const content = attack.notes.endsWith('.') ? attack.notes : attack.notes + '.'
    const notesSpan = !!attack.notes ? span(gurpslink(content), { class: 'gb-notes' }) : ''

    return nameSpan + ': ' + damageOutput + parrySpan + ' ' + notesSpan
  }

  function span(content, options = {}) {
    const classText = options.class ? ` class='${options.class}'` : ''
    const dataText = options.data
      ? Object.entries(options.data)
          .map(([key, value]) => ` data-${key}='${value}'`)
          .join('')
      : ''
    return `<span${classText}${dataText}>${content}</span>`
  }

  function displayNumber(number, options = { showPlus: true }) {
    if (number > 0) {
      return options.showPlus ? `+${number}` : `${number}`
    } else if (number < 0) {
      return `&minus;${Math.abs(number)}`
    } else {
      return '0'
    }
  }

  function gurpslink(text) {
    return GURPS.gurpslink(text)
  }

  const thresholdLabelMap = {
    Grabbed: '1/10×',
    Grappled: '1/2×',
    Restrained: 'CM',
    Controlled: '1.5×',
    Pinned: '2×',
  }

  Handlebars.registerHelper('gb-thresholdAbbrev', function (threshold) {
    return thresholdLabelMap[threshold] ?? ''
  })

  const toRemove = []
  Handlebars.registerHelper('gb-traitFilter', function (traits) {
    const array = objectToArray(traits)
    return arrayToObject(
      array.filter(it => !it.notes?.includes('<HIDE/>')),
      5
    )
  })

  /**
   * For now, just handle integer addition.
   *
   * The expected input is a string that can be parsed into <number>+<number> after removing all spaces.
   */
  Handlebars.registerHelper('gb-calculate', function (formula, options) {
    const ADD_INTS = /^\s*(?<left>(?:[-–]?\d+))\s*\+\s*(?<right>(?:[-–]?\d+))\s*$/i
    const matches = formula.toString().match(ADD_INTS)
    if (matches) {
      const left = parseInt(matches.groups.left)
      const right = parseInt(matches.groups.right)
      return `${left + right}`
    }
    return formula
  })

  fetch(`/modules/${module}/templates/attack-ranged.hbs`)
    .then(it => it.text())
    .then(async text => {
      Handlebars.registerPartial('gb-attack-ranged', text)
    })

  fetch(`/modules/${module}/templates/attack-melee.hbs`)
    .then(it => it.text())
    .then(async text => {
      Handlebars.registerPartial('gb-attack-melee', text)
    })

  //  globalThis.GURPS = GURPS
  const GBQuickReferenceSheet = (await import('./gb-quickref-sheet.js')).default

  Actors.registerSheet('gurps', GBQuickReferenceSheet, {
    types: ['enemy', 'character'],
    label: 'GB Quick Reference Sheet',
    makeDefault: false,
  })
}

/**
 * Converts any Array into an Object. Each element of the array will be a property of
 * the returned object, with a key equal to the index into the array converted to a
 * String of length <indexLength>. The String is padded with leading zeros to get the
 * required length.
 *
 * @param {Array<any>} array
 * @param {Number} indexLength - number of characters to use as the property key
 * @returns Object
 */
export function arrayToObject(array, indexLength = 4) {
  let data = /** @type {{[key: string]: string}} */ ({})
  array.forEach((item, index) => {
    data[GURPS.genkey(index, indexLength)] = item
  })
  return data
}

/**
 * Converts an object into an array of its property values. The order of properties will be the
 * natural sorting order of the keys.
 *
 * WARNING:
 * The intent is to provide the reverse of the arrayToObject function (above), where an array is
 * converted into an Object. The property values in that case are the elements of the array, and
 * the keys are the element's index converted into a zero-padded string: 0 -> "0000", 1 -> "0001",
 * 12 -> "0012", etc.
 *
 * However, there are no sanity checks of any kind done to ensure that the object matches the
 * output of the arrayToObject() method; any object will be converted to an array of its property
 * values, losing the values of its keys if they do not correspond to the array index.
 *
 * @param {Object|{ [key: string]: any}} object
 * @returns {any[]} an Array of property values
 */
export function objectToArray(object) {
  return Object.keys(object)
    .sort((a, b) => a.localeCompare(b))
    .map(key => object[key])
}
