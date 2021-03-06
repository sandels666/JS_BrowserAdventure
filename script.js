
const gameState = {
  currentLocation: '',
  previousLocation: '',
  beersDrunk: 0,
  playerHealth: 0,
  playerMana: 0,
  playerDodgeChance: 0,
  playerClass: '',
  playerGold: 0,
  playerItems: [],
  playerWeapon: '',
}

const GameConstants = {
  startLocation: 'menu',
  startPlayerHealth: 100,
  startPlayerMana: 100,
  startPlayerDodgeChance: 10,
  startPlayerBeersDrunk: 0,
  startPlayerGold: 50,
  startPlayerItems: ['healthpotion'],
  startPlayerWeapon: '',
  beerPrice: 2
}

const UI = {
  setThemeImage: (image) => {
    const imageElement = document.getElementById('themeImage')
    imageElement.setAttribute('src', image)
  },
  setThemeButtons: (actions) => {
    // Clear existing buttons
    const existingButtons = Array.from(document.getElementsByClassName('action-button'))
    existingButtons.forEach(button => button.remove())

    // Find Root
    const bodyElement = document.getElementById('gameRoot')

    // Loop through actions
    actions.forEach(action => {
      const myButton = document.createElement('button')
      myButton.setAttribute('class', 'block action-button')
      myButton.innerHTML = action.label
      myButton.addEventListener('click', action.action)
      bodyElement.append(myButton)
    })
  }
}

const LocationManager = {
  _locationStack: [],
  pushLocation(location) {
    this._locationStack.unshift(location)
  },
  getPriorLocation(hops) {
    return this._locationStack[hops]
  }
}

const GameManager = {
  setRoom: (targetRoom) => {
    gameState.previousLocation = gameState.currentLocation
    gameState.currentLocation = targetRoom
    UI.setThemeImage(targetRoom.image)
    UI.setThemeButtons(targetRoom.actions)
    DescriptionManager.set(targetRoom.description)
    Events.emit('RoomChanges', gameState.currentLocation, targetRoom)
  }
}

const CombatManager = {
  _currentEnemy: undefined,
  _sourceRoom: undefined,
  hasPendingFight() {
    return !!this.getCurrentEnemy()
  },
  setCurrentEnemyGivenRoom(sourceRoom) {
    this._currentEnemy = sourceRoom.enemy
    this._sourceRoom = sourceRoom
  },
  getCurrentEnemy() {
    return this._currentEnemy
  },
  complete() {
    this._sourceRoom.enemy = undefined
    this.clear()
  },
  clear() {
    this._currentEnemy = undefined
    this._sourceRoom = undefined
  },
  getLootRoll() {
    return this._currentEnemy.lootTable.map(item => {
      return item.itemTag
    })
  }
}

const InventoryManager = {
  add(loot) {
    loot.forEach(item => {
      gameState.playerItems.push(item)
    })
  }
}

const DescriptionManager = {
  set(description) {
    document.getElementById('themeDescription').innerHTML = description
  },
  add(description) {
    var oldDesc = document.getElementById('themeDescription').innerHTML
    document.getElementById('themeDescription').innerHTML = oldDesc + "<br>" + description
  }

}


//Event System
class Events {
  static bus = {}

  static register(eventName, func) {
    const event = this.bus[eventName]
    if (!event) {
      this.bus[eventName] = []
    }
    this.bus[eventName].push(func)
  }

  static emit(eventName, ...params) {
    const event = this.bus[eventName]
    if (!event) {
      return
    }
    event.forEach(listener => {
      listener(...params)
    })
  }
}




Events.register("Drink", () => {
  gameState.beersDrunk += 1
})

Events.register("Drink", () => {
  gameState.playerGold -= GameConstants.beerPrice
})

Events.register("Drink", () => {
  DescriptionManager.set("Drinking beer #" + gameState.beersDrunk)
})

Events.register("Drink", () => {
  Events.emit("PrintPlayerGold")
  if (gameState.beersDrunk > 7) {
    Events.emit("PlayerGettingTipsy")
  }
  if (gameState.beersDrunk > 10) {
    Events.emit("PlayerTakesDamage", 10, "Alcohol")
  }
})

Events.register("PlayerGettingTipsy", () => {
  DescriptionManager.add("You probably shouldn't drink any more...")
})




//======== COMBAT SYSTEM =========//
Events.register("Attack", (enemy) => {
  const playerWeapon = gameState.playerWeapon
  const playerDamage = ItemTagDictionary[playerWeapon].damage
  const enemyWeapon = enemy.weaponTag
  const enemyDamage = ItemTagDictionary[enemyWeapon].damage

  //Player deals damage
  enemy.health = enemy.health - playerDamage
  DescriptionManager.set("You hit " + enemy.name + " for " + playerDamage + " damage!")
  DescriptionManager.add(enemy.name + " has " + enemy.health + " health left.")

  //Check if enemy is still alive
  if (enemy.health < 1) {
    Events.emit('EnemyDeath', enemy)
  }
  else {
    //Enemy deals damage
    Events.emit("PlayerTakesDamage", enemyDamage, "Skeleton")
    DescriptionManager.add(enemy.name + " hits you for " + enemyDamage + " damage!")
    DescriptionManager.add("You have " + gameState.playerHealth + " health left.")
  }
})


Events.register("EnemyDeath", (enemy) => {
  const loot = CombatManager.getLootRoll() // ['sword', 'bones']
  InventoryManager.add(loot)
  CombatManager.complete()
  GameManager.setRoom(gameState.previousLocation)
  DescriptionManager.set(enemy.name + " dies!")
})
//======== COMBAT SYSTEM =========//





Events.register("PrintPlayerGold", () => {
  DescriptionManager.add("You have " + gameState.playerGold + " gold left.")
  console.log(gameState.playerItems)
})

Events.register("PrintPlayerItems", () => {
  DescriptionManager.set("Player's inventory:")
  gameState.playerItems.forEach(playerItem => {
    DescriptionManager.add(ItemTagDictionary[playerItem].name)
  })

  //logging to console for testing
  console.log("Player's inventory:")
  gameState.playerItems.forEach(playerItem => {
    console.log(ItemTagDictionary[playerItem])
  })
})

Events.register("PlayerDeath", (deathReason) => {
  GameManager.setRoom(gameWorld.death)
  if (deathReason) {
    UI.addToThemeDescription("You were killed by: " + deathReason)
  }
})

Events.register("NewGame", () => {
  gameState.beersDrunk = GameConstants.startPlayerBeersDrunk
  gameState.playerHealth = GameConstants.startPlayerHealth
  gameState.playerMana = GameConstants.startPlayerMana
  gameState.playerGold = GameConstants.startPlayerGold
  gameState.playerItems = GameConstants.startPlayerItems.map(a => a)
  gameState.playerWeapon = GameConstants.startPlayerWeapon
})

Events.register("PlayerTakesDamage", (damage, damageReason) => {
  gameState.playerHealth -= damage
  console.log("HP = " + gameState.playerHealth)
  if (gameState.playerHealth < 1) {
    Events.emit("PlayerDeath", damageReason)
  }
})

Events.register("RoomChanges", (currentRoom, targetRoom) => {
  LocationManager.pushLocation(targetRoom)
})

Events.register("RoomChanges", (currentRoom, targetRoom) => {
  if (targetRoom.enemy) {
    CombatManager.setCurrentEnemyGivenRoom(targetRoom)
  }
})

Events.register("RoomChanges", (currentRoom, targetRoom) => {
  if (CombatManager.hasPendingFight() && currentRoom.tag !== 'combatRoom') {
    console.log('Going to combat room')
    GameManager.setRoom(gameWorld.combatRoom)
  }
})




function create(itemTag, options = {}) {
  return {
    ...ItemTagDictionary[itemTag],
    ...options
  }
}

// function getLootRoll(entity) {
//   const roll = Math.random()
//   const succesfulLoot = entity.lootTable.filter(lootOption => lootOption.chance >= roll)
//   return succesfulLoot.map(lootOption => lootOption.item)
// }



//=============== ITEMS AND ENEMIES STATS ===============//

const ItemTagDictionary = {
  //--ITEMS--//
  bronzedagger: {
    name: "Bronze dagger",
    damage: 3,
    value: 3,
    weight: 1
  },
  bronzesword: {
    name: "Bronze sword",
    damage: 5,
    value: 5,
    weight: 2
  },
  irondagger: {
    name: "Iron dagger",
    damage: 8,
    value: 8,
    weight: 1
  },
  ironsword: {
    name: "Iron sword",
    damage: 10,
    value: 10,
    weight: 3,
  },
  staff: {
    name: "Staff",
    damage: 3,
    value: 5,
    weight: 3
  },
  clotharmor: {
    name: "Cloth armor",
    armor: 2,
    value: 10,
    weight: 1.5,
  },
  leatherarmor: {
    name: "Leather armor",
    armor: 5,
    value: 10,
    weight: 3
  },
  ironarmor: {
    name: "Iron armor",
    armor: 10,
    value: 20,
    weight: 10
  },
  healthpotion: {
    name: "Health potion",
    value: 15,
    weight: 0.5,
  },
  bones: {
    name: "Bones",
    value: 1,
    weight: 5,
  },
  batbones: {
    name: "Bat bones",
    value: 5,
    weight: 1
  },
  spidercarcass: {
    name: "Spider carcass",
    value: 2,
    weight: 2
  },
  spidervenom: {
    name: "Spider venom",
    value: 10,
    weight: 1
  },

  //--MONSTERS--//
  skeleton: {
    name: "Skeleton",
    health: 50,
    weaponTag: 'bronzedagger',
    lootTable: [
      {
        itemTag: 'bones',
        dropchance: 1.00
      },
      {
        itemTag: 'bronzedagger',
        dropchance: 0.90
      }
    ]
  },
  giantspider: {
    name: "Giant Spider",
    health: 30,
    mana: 10,
    lootTable: [
      {
        itemTag: "spidercarcass",
        dropchance: 1.00
      },
      {
        itemTag: "spidervenom",
        dropchance: 0.5
      }
    ]
  },
  goblin: {
    name: "Goblin",
    health: 20,
    mana: 5,
    lootTable: [
      {
        itemTag: 'bones',
        dropchance: 1.00
      },
    ]
  },
  vampire: {
    name: "Vampire",
    health: 70,
    mana: 50,
    lootTable: [
      {
        itemTag: 'batbones',
        dropchance: 1.00
      },
    ]
  },
}


let currentEnemy = undefined



//TODO: Improve combat system, healing food/potions
//TODO: Improve class system
//TODO: Shops, currency

//=============== ROOMS ===============//
const gameWorld = {
  menu: {
    image: 'img/menu.png',
    description: "Welcome to Browser Adventure!",
    actions: [
      {
        label: "New game",
        action: () => {
          Events.emit('NewGame')
          GameManager.setRoom(gameWorld.chooseclass)
        }
      },
      {
        label: "Load game",
        action: () => {
          DescriptionManager.set("Sorry, loading a game doesn't work yet!")
        }
      },
      {
        label: "Options",
        action: () => {
          DescriptionManager.set("Sorry, there's no options yet!")
        }
      },
      {
        label: "Credits",
        action: () => {
          GameManager.setRoom(gameWorld.credits)
        }
      },
      {
        label: "Exit",
        action: () => closeWindow()
      }
    ]
  },
  chooseclass: {
    image: 'img/chooseclass.png',
    description: "Choose a class! <br/><br/> Warriors have more health, Rogues have a higher dodge chance, and Wizards have more mana.",
    actions: [
      {
        label: "Warrior",
        action: () => {
          gameState.playerClass = 'warrior'
          gameState.playerHealth *= 1.5
          gameState.playerMana *= 0.5
          gameState.playerItems.push('ironsword')
          gameState.playerItems.push('ironarmor')
          gameState.playerWeapon = 'ironsword'
          //TODO: parry/block chance
          GameManager.setRoom(gameWorld.playerhome)
        }
      },
      {
        label: "Rogue",
        action: () => {
          gameState.playerClass = 'rogue'
          gameState.playerHealth *= 1
          gameState.playerMana *= 0.7
          gameState.playerDodgeChance *= 2
          gameState.playerItems.push('irondagger')
          gameState.playerItems.push('leatherarmor')
          gameState.playerWeapon = 'irondagger'
          GameManager.setRoom(gameWorld.playerhome)
        }
      },
      {
        label: "Wizard",
        action: () => {
          gameState.playerClass = 'wizard'
          gameState.playerHealth *= 0.9
          gameState.playerMana *= 2
          gameState.playerItems.push('staff')
          gameState.playerItems.push('clotharmor')
          gameState.playerWeapon = 'staff'
          GameManager.setRoom(gameWorld.playerhome)
        }
      }
    ]
  },
  credits: {
    image: 'img/credits.png',
    description: "Thanks for playing! -Santeri",
    actions: [
      {
        label: "Back to Main Menu",
        action: () => GameManager.setRoom(gameWorld.menu)
      }
    ]
  },
  death: {
    image: 'img/death.png',
    description: "Oh dear, you're dead! Learn to play, noob.",
    actions: [
      {
        label: "Back to Main Menu",
        action: () => GameManager.setRoom(gameWorld.menu)
      }
    ]
  },
  combatRoom: {
    tag: 'combatRoom',
    image: 'img/combat_skeleton.png',
    description: "An angry skeleton attacks you!",
    actions: [
      {
        label: "Attack",
        action: () => Events.emit('Attack', CombatManager.getCurrentEnemy())
      },
      {
        label: "Dodge",
        action: () => Events.emit('Dodge')
      },
      {
        label: "Run away",
        action: () => {
          CombatManager.clear()
          GameManager.setRoom(LocationManager.getPriorLocation(2))
          DescriptionManager.add("You manage to run away safely.")
        }
      },
    ]
  },
  // combat_skeleton: {
  //   image: 'img/combat_skeleton.png',
  //   description: "An angry skeleton attacks you!",
  //   enemy: currentEnemy,
  //   actions: [
  //     {
  //       label: "Attack",
  //       action: () => Events.emit('Attack', currentEnemy)
  //     },
  //     {
  //       label: "Dodge",
  //       action: () => Events.emit('Dodge')
  //     },
  //     {
  //       label: "Run away",
  //       action: () => {
  //         GameManager.setRoom(gameWorld[gameState.previousLocation])
  //         DescriptionManager.add("You manage to run away safely.")
  //       }
  //     },
  //   ]
  // },
  playerhome: {
    image: 'img/playerhome1.png',
    description: "You're at the entrance of your home. <br>"
      + "You can see the kitchen ahead, and there's a set of stairs leading to the bedroom.",
    actions: [
      {
        label: "Go to the kitchen",
        action: () => {
          GameManager.setRoom(gameWorld.playerhome_kitchen)
        }
      },
      {
        label: "Go to the bedroom",
        action: () => {
          GameManager.setRoom(gameWorld.playerhome_bedroom)
          // if (!gameState.skeletonDefeated) {
          //   GameManager.setRoom(gameWorld.combat_skeleton)
          //   currentEnemy = create('skeleton', {
          //     health: 44,
          //     weapon: 'ironsword',
          //     lootTable: [
          //       {
          //         name: 'healthpotion',
          //         dropchance: 0.5
          //       }
          //     ]
          //   })
          // }
          // else {
          //   GameManager.setRoom(gameWorld.playerhome_bedroom)
          // }
        }
      },
      {
        label: "Look around",
        action: () => {
          DescriptionManager.set(gameWorld.playerhome.description)
        }
      },
      {
        label: "Leave",
        action: () => {
          GameManager.setRoom(gameWorld.townsquare)
        }
      },
      {
        label: "Inventory",
        action: () => Events.emit('PrintPlayerItems')
      },
      {
        label: "Save & Quit",
        action: () => GameManager.setRoom(gameWorld.menu)
      }
    ]
  },
  playerhome_kitchen: {
    image: 'img/playerhome_kitchen.png',
    description: "You're in your kitchen. <br>"
      + "There's some food left on the table. Your home's entrance is behind you.",
    actions: [
      {
        label: "Eat some food",
        action: () => {
          //
        }
      },
      {
        label: "Go back to the entrance",
        action: () => {
          GameManager.setRoom(gameWorld.playerhome)
        }
      },
      {
        label: "Look around",
        action: () => {
          DescriptionManager.set(gameWorld.playerhome_kitchen.description)
        }
      },
      {
        label: "Inventory",
        action: () => Events.emit('PrintPlayerItems')
      },
      {
        label: "Save & Quit",
        action: () => GameManager.setRoom(gameWorld.menu)
      }
    ]
  },
  playerhome_bedroom: {
    image: 'img/playerhome_bedroom.png',
    description: "You're upstairs in your bedroom. <br>"
      + "The bed looks comfy. There's stairs behind you leading back to the entrance of your home.",
    enemy: create('skeleton'),
    actions: [
      {
        label: "Go to sleep",
        action: () => {
          //
        }
      },
      {
        label: "Go back downstairs",
        action: () => {
          GameManager.setRoom(gameWorld.playerhome)
        }
      },
      {
        label: "Look around",
        action: () => {
          DescriptionManager.set(gameWorld.playerhome_bedroom.description)
        }
      },
      {
        label: "Inventory",
        action: () => Events.emit('PrintPlayerItems')
      },
      {
        label: "Save & Quit",
        action: () => GameManager.setRoom(gameWorld.menu)
      }
    ]
  },
  townsquare: {
    image: 'img/townsquare1.png',
    description: "You're at the town square. <br>"
      + "Your home is behind you. There's a bar next to you. There's a path leading out of town.",
    actions: [
      {
        label: "Go for a drink at the bar",
        action: () => {
          GameManager.setRoom(gameWorld.bar)
        }
      },
      {
        label: "Go home",
        action: () => {
          GameManager.setRoom(gameWorld.playerHome)
        }
      },
      {
        label: "Look around",
        action: () => {
          DescriptionManager.set(gameWorld.townsquare.description)
        }
      },
      {
        label: "Leave town",
        action: () => {
          GameManager.setRoom(gameWorld.forest)
        }
      },
      {
        label: "Inventory",
        action: () => Events.emit('PrintPlayerItems')
      },
      {
        label: "Save & Quit",
        action: () => GameManager.setRoom(gameWorld.menu)
      }
    ]
  },
  bar: {
    image: 'img/bar1.png',
    description: "You're at a local bar.",
    actions: [
      {
        label: "Buy a Beer (" + GameConstants.beerPrice + " gold)",
        action: () => {
          //checking if player has enough gold
          if (gameState.playerGold >= GameConstants.beerPrice) {
            Events.emit('Drink')
          }
          else {
            DescriptionManager.set("You can't afford that!")
          }
        }
      },
      {
        label: "Shout at bartender",
        action: () => {
          DescriptionManager.set("You yell: &quot;Oi! What arr ye lookin' at!&quot; <br> The man doesn't seem to like it...")
        }
      },
      {
        label: "Look around",
        action: () => {
          DescriptionManager.set(gameWorld.bar.description)
        }
      },
      {
        label: "Leave Bar",
        action: () => {
          GameManager.setRoom(gameWorld.townsquare)
        }
      },
      {
        label: "Inventory",
        action: () => Events.emit('PrintPlayerItems')
      },
      {
        label: "Save & Quit",
        action: () => GameManager.setRoom(gameWorld.menu)
      }
    ]
  },
  forest: {
    image: 'img/forest_clear.png',
    description: "You're in a forest. <br>"
      + "A path leads to a nearby town, and another deeper into the forest. You can also hear a river nearby. ",
    actions: [
      {
        label: "Explore deeper into the forest",
        action: () => {
          GameManager.setRoom(gameWorld.forest_fog)
        }
      },
      {
        label: "Go to the river",
        action: () => {
          GameManager.setRoom(gameWorld.river)
        }
      },
      {
        label: "Look around",
        action: () => {
          DescriptionManager.set(gameWorld.forest.description)
        }
      },
      {
        label: "Enter town",
        action: () => {
          GameManager.setRoom(gameWorld.townsquare)
        }
      },
      {
        label: "Inventory",
        action: () => Events.emit('PrintPlayerItems')
      },
      {
        label: "Save & Quit",
        action: () => GameManager.setRoom(gameWorld.menu)
      }
    ]
  },
  forest_fog: {
    image: 'img/forest_fog.png',
    description: "You're in a forest. It looks foggy and ominous here... <br>"
      + "A path leads back to the forest's edge, and another even deeper into the forest. ",
    actions: [
      {
        label: "Explore even deeper",
        action: () => {
          GameManager.setRoom(gameWorld.cabin)
        }
      },
      {
        label: "Go back to the forest's edge",
        action: () => {
          GameManager.setRoom(gameWorld.forest)
        }
      },
      {
        label: "Look around",
        action: () => {
          DescriptionManager.set(gameWorld.forest_fog.description)
        }
      },
      {
        label: "Inventory",
        action: () => Events.emit('PrintPlayerItems')
      },
      {
        label: "Save & Quit",
        action: () => GameManager.setRoom(gameWorld.menu)
      }
    ]
  },
  cabin: {
    image: 'img/cabin.png',
    description: "You find a creepy cabin in the middle of the woods... <br>"
      + "You can enter the cabin or leave.",
    actions: [
      {
        label: "Enter cabin",
        action: () => {
          GameManager.setRoom(gameWorld.cabin_inside)
        }
      },
      {
        label: "Leave",
        action: () => {
          GameManager.setRoom(gameWorld.forest_fog)
        }
      },
      {
        label: "Look around",
        action: () => {
          DescriptionManager.set(gameWorld.cabin.description)
        }
      },
      {
        label: "Inventory",
        action: () => Events.emit('PrintPlayerItems')
      },
      {
        label: "Save & Quit",
        action: () => GameManager.setRoom(gameWorld.menu)
      }
    ]
  },
  cabin_inside: {
    image: 'img/cabin_inside.png',
    description: "You abandoned all sense and entered the creepy cabin in the woods. <br>"
      + "There's a body laying on a bed. You're not sure if it's dead or alive...",
    actions: [
      {
        label: "Poke the body",
        action: () => {
          Events.emit("PlayerDeath", "Bloodthirsty vampire!")
        }
      },
      {
        label: "Run for your life!",
        action: () => {
          GameManager.setRoom(gameWorld.forest)
        }
      },
      {
        label: "Look around",
        action: () => {
          DescriptionManager.set(gameWorld.cabin_inside.description)
        }
      },
      {
        label: "Inventory",
        action: () => Events.emit('PrintPlayerItems')
      },
      {
        label: "Save & Quit",
        action: () => GameManager.setRoom(gameWorld.menu)
      }
    ]
  },
  river: {
    image: 'img/river.png',
    description: "You're at the bank of a flowing river. <br>"
      + "You can see a snowy forest far ahead of you. There's also a clear forest behind you leading into a town.",
    actions: [
      {
        label: "Go to snowy forest",
        action: () => {
          GameManager.setRoom(gameWorld.snowforest)
        }
      },
      {
        label: "Look around",
        action: () => {
          DescriptionManager.set(gameWorld.river.description)
        }
      },
      {
        label: "Go to the clear forest",
        action: () => {
          GameManager.setRoom(gameWorld.forest)
        }
      },
      {
        label: "Inventory",
        action: () => Events.emit('PrintPlayerItems')
      },
      {
        label: "Save & Quit",
        action: () => GameManager.setRoom(gameWorld.menu)
      }
    ]
  }
}

function startGame() {
  GameManager.setRoom(gameWorld[GameConstants.startLocation])
}

function closeWindow() {
  if (confirm("Exit Browser Adventure?")) {
    window.close()
  }
}

document.onload = startGame();
