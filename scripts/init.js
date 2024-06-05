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

  const toRemove = ['Natural Attacks']
  Handlebars.registerHelper('gb-traitFilter', function (traits) {
    const array = objectToArray(traits)
    return arrayToObject(
      array.filter(trait => !toRemove.includes(trait.name)),
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

  Handlebars.registerHelper('gb-collapseMelee', function (array) {
    let results = []
    for (let i = 0; i < array.length; i++) {
      if (array[i] == null) continue
      let melee = array[i]
      let item = {
        name: melee.name,
        level: melee.level,
        notes: melee.notes,
        parry: melee.parry,
        cost: melee.cost,
        damage: [
          {
            damage: melee.damage,
            reach: melee.reach,
            followup: melee.followup,
            damagenotes: melee.damagenotes,
            mode: melee.mode,
          },
        ],
      }

      for (let j = 0; j < array.length; j++) {
        if (j !== i && array[j] !== null)
          if (melee.name === array[j].name && melee.level === array[j].level && melee.notes === array[j].notes) {
            item.damage.push({
              damage: array[j].damage,
              reach: array[j].reach,
              followup: array[j].followup,
              damagenotes: array[j].damagenotes,
              mode: array[j].mode,
            })
            array[j] = null
          }
      }
      results.push(item)
    }
    return results
  })

  Handlebars.registerHelper('gb-collapseRanged', function (array) {
    let results = []
    for (let i = 0; i < array.length; i++) {
      if (array[i] == null) continue
      let ranged = array[i]

      // if damage looks like <damage>/<number>point<s> then set damage to <damage> and cost to <number>
      const regex = /(?<damage>.*?)\/(?<points>\d+)?\s*point(?:s)?/
      if (ranged.damage && ranged.damage.toString().match(regex)) {
        convertToDamageAccum(ranged, regex)
      }

      let item = createRangedItem(ranged)

      for (let j = 0; j < array.length; j++) {
        if (j !== i && array[j] !== null)
          if (isValidRanged(ranged, array, j)) {
            item.damagecomponent.push({
              damage: array[j].damage,
              followup: array[j].followup,
              damagenotes: array[j].damagenotes,
            })
            array[j] = null
          }
      }
      results.push(item)
    }
    return results
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

  function convertToDamageAccum(ranged, regex) {
    const groups = ranged.damage.toString().match(regex).groups
    ranged.damage = `+${groups.damage}`
    ranged.cost = +(groups.points || 1)
  }

  function isValidRanged(ranged, array, j) {
    return (
      ranged.name === array[j].name &&
      ranged.level === array[j].level &&
      ranged.notes === array[j].notes &&
      ranged.acc === array[j].acc &&
      ranged.bulk === array[j].bulk &&
      ranged.range === array[j].range &&
      ranged.shots === array[j].shots &&
      ranged.rcl === array[j].rcl &&
      ranged.cost === array[j].cost
    )
  }

  function createRangedItem(ranged) {
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
      damagecomponent: [
        {
          damage: ranged.damage,
          followup: ranged.followup,
          damagenotes: ranged.damagenotes,
        },
      ],
    }
  }
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
