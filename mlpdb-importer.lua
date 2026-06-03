-- MLP.DB Tabletop Simulator deck importer.
-- Paste the website's Export -> TTS text into the input, then press Import Deck.

local IMAGE_BASE_URL = "https://raw.githubusercontent.com/DinoDexter/MLP.DB/main/card_images/"
local MAIN_DECK_BACK_URL = "https://raw.githubusercontent.com/DinoDexter/MLP.DB/main/tts/mlp-main-deck-back.jpg"
local OTHER_DECK_BACK_URL = "https://raw.githubusercontent.com/DinoDexter/MLP.DB/main/tts/mlp-other-deck-back.jpg"

local pileOrder = {
  "Main Character",
  "Main Deck",
  "Story Deck",
  "Scene Deck",
}

local pilePositions = {
  ["Main Character"] = {-7.5, 2.2, 0},
  ["Main Deck"] = {-2.5, 2.2, 0},
  ["Story Deck"] = {2.5, 2.2, 0},
  ["Scene Deck"] = {7.5, 2.2, 0},
}

local pileBackUrls = {
  ["Main Character"] = OTHER_DECK_BACK_URL,
  ["Main Deck"] = MAIN_DECK_BACK_URL,
  ["Story Deck"] = OTHER_DECK_BACK_URL,
  ["Scene Deck"] = OTHER_DECK_BACK_URL,
}

local deckInputText = ""
local spawnedGuids = {}

function onLoad()
  UI.setXml([[
    <Panel id="mlpdbPanel" position="0 -360" width="780" height="350" color="#080A0EEE" allowDragging="true" returnToOriginalPositionWhenReleased="false">
      <VerticalLayout spacing="8" padding="14 14 14 14">
        <Text text="MLP.DB Deck Importer" fontSize="28" color="#FFFFFF" alignment="MiddleCenter" />
        <Text text="Paste the website Export > TTS decklist below." fontSize="15" color="#D7DBE5" alignment="MiddleCenter" />
        <InputField id="mlpdbDeckInput" onValueChanged="mlpdbDeckInputChanged" lineType="MultiLineNewline" text="" placeholder="=== Main Deck ===&#10;4 BP01-C01" fontSize="15" textColor="#111827" colors="#FFFFFF|#FFFFFF|#FFFFFF|#FFFFFF" preferredHeight="190" />
        <HorizontalLayout spacing="8" childForceExpandWidth="true">
          <Button id="mlpdbImportButton" onClick="mlpdbImportDeck" text="Import Deck" fontSize="18" colors="#2F794F|#3E9364|#276441|#666666" />
          <Button id="mlpdbClearButton" onClick="mlpdbClearSpawned" text="Clear Imported" fontSize="18" colors="#303747|#3A4355|#252B38|#666666" />
        </HorizontalLayout>
      </VerticalLayout>
    </Panel>
  ]])
  print("MLP.DB importer loaded. Paste Export > TTS text into the panel, then press Import Deck.")
end

function mlpdbDeckInputChanged(player, value, id)
  deckInputText = value or ""
end

function mlpdbImportDeck(player, value, id)
  local parsed = parseDeckText(deckInputText)
  local total = countCards(parsed)

  if total == 0 then
    broadcastToColor("Paste a TTS export from MLP.DB first.", player.color, {1, 0.35, 0.35})
    return
  end

  mlpdbClearSpawned()
  spawnParsedDeck(parsed)
  broadcastToAll("MLP.DB imported " .. total .. " cards.", {0.55, 1, 0.7})
end

function mlpdbClearSpawned()
  for _, guid in ipairs(spawnedGuids) do
    local obj = getObjectFromGUID(guid)
    if obj then
      destroyObject(obj)
    end
  end
  spawnedGuids = {}
end

function parseDeckText(text)
  local piles = {}
  for _, pileName in ipairs(pileOrder) do
    piles[pileName] = {}
  end

  local currentPile = "Main Deck"
  for rawLine in tostring(text or ""):gmatch("[^\r\n]+") do
    local line = trim(rawLine)

    if line ~= "" then
      local header = line:match("^===%s*(.-)%s*===$")
      if header then
        currentPile = normalizePileName(header)
      else
        local qty, cardId = parseDeckLine(line)
        if qty and cardId then
          table.insert(piles[currentPile], {
            qty = qty,
            id = cardId,
          })
        end
      end
    end
  end

  return piles
end

function parseDeckLine(line)
  local qtyText, rest = line:match("^(%d+)%s*x?%s+(.+)$")
  if not rest then
    qtyText = "1"
    rest = line
  end

  rest = trim(rest)
  local cardId = rest:match("^([^:%s]+)")
  if not cardId then
    return nil, nil
  end

  local qty = tonumber(qtyText) or 1
  if qty < 1 then
    qty = 1
  end

  return math.floor(qty), cardId
end

function normalizePileName(value)
  local lowered = string.lower(trim(value))
  if lowered == "main character" then
    return "Main Character"
  end
  if lowered == "story" or lowered == "story deck" then
    return "Story Deck"
  end
  if lowered == "scene" or lowered == "scene deck" then
    return "Scene Deck"
  end
  return "Main Deck"
end

function spawnParsedDeck(parsed)
  for _, pileName in ipairs(pileOrder) do
    local entries = parsed[pileName] or {}
    if #entries > 0 then
      spawnPile(pileName, entries)
    end
  end
end

function spawnPile(pileName, entries)
  local basePosition = pilePositions[pileName]
  local pileCards = {}
  local index = 0

  for _, entry in ipairs(entries) do
    for copy = 1, entry.qty do
      index = index + 1
      local pos = {
        basePosition[1],
        basePosition[2] + (index * 0.08),
        basePosition[3],
      }
      spawnCard(entry.id, pileName, pos, pileCards)
    end
  end

  Wait.time(function()
    stackPile(pileName, pileCards)
  end, 2.5)
end

function spawnCard(cardId, pileName, position, pileCards)
  local card = spawnObject({
    type = "CardCustom",
    position = position,
    rotation = {0, 180, 0},
    sound = false,
  })

  card.setCustomObject({
    face = cardFaceUrl(cardId),
    back = cardBackUrl(pileName),
    sideways = false,
  })
  card.setName(cardId)
  card.setDescription("MLP.DB " .. pileName)
  local reloaded = card.reload()
  if reloaded then
    card = reloaded
  end

  Wait.time(function()
    if card and not card.isDestroyed() then
      table.insert(spawnedGuids, card.getGUID())
      table.insert(pileCards, card)
    end
  end, 0.4)
end

function stackPile(pileName, pileCards)
  if #pileCards == 0 then
    return
  end

  local grouped = group(pileCards)
  local deck = grouped and grouped[1] or pileCards[1]

  Wait.time(function()
    if deck and not deck.isDestroyed() then
      deck.setName("MLP.DB " .. pileName)
      deck.shuffle()
    end
  end, 0.5)
end

function countCards(parsed)
  local total = 0
  for _, pileName in ipairs(pileOrder) do
    for _, entry in ipairs(parsed[pileName] or {}) do
      total = total + entry.qty
    end
  end
  return total
end

function cardFaceUrl(cardId)
  return IMAGE_BASE_URL .. urlEncode(cardId .. ".jpg")
end

function cardBackUrl(pileName)
  return pileBackUrls[pileName] or OTHER_DECK_BACK_URL
end

function urlEncode(value)
  return tostring(value):gsub("([^%w%-_%.~])", function(char)
    return string.format("%%%02X", string.byte(char))
  end)
end

function trim(value)
  return tostring(value or ""):match("^%s*(.-)%s*$")
end
