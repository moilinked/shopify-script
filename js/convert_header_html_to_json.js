const fs = require('fs')
const path = require('path')

const DEFAULT_INPUT = path.join(__dirname, 'header.html')
const DEFAULT_OUTPUT = path.join(__dirname, 'header.generated.json')
const ORIGIN = 'https://www.waterdropfilter.co.uk'

const decodeEntities = (value = '') =>
  String(value)
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))

const cleanText = (value = '') => decodeEntities(value).replace(/\s+/g, ' ').trim()

const slugify = (value = '') =>
  cleanText(value)
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const stripTags = (value = '') => value.replace(/<[^>]*>/g, '')

const normalizeUrl = (value = '') => {
  if (!value) return ''
  let url = cleanText(value)
  if (url.startsWith(ORIGIN)) {
    url = url.slice(ORIGIN.length)
  }

  url = url.replace(/\?ref=headermenuu\b/g, '?ref=headermenu')
  url = url.replace(/(\?variant=[^?&]+)\?ref=headermenu\b/g, '$1&ref=headermenu')
  return url
}

const getAttr = (tag = '', attrName = '') => {
  const match = tag.match(new RegExp(`${attrName}\\s*=\\s*"([^"]*)"`, 'i'))
  return match ? match[1] : ''
}

const getTagInner = (block = '', tagName = '') => {
  const re = new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i')
  const match = block.match(re)
  return match ? match[1] : ''
}

const getBlockInner = (block = '') => {
  const openEnd = block.indexOf('>')
  const closeStart = block.lastIndexOf('</')
  if (openEnd === -1 || closeStart === -1 || closeStart <= openEnd) return ''
  return block.slice(openEnd + 1, closeStart)
}

const getClassNames = (tagOpen = '') => {
  const classValue = getAttr(tagOpen, 'class')
  return classValue ? classValue.split(/\s+/).filter(Boolean) : []
}

const getTagBlocks = (block = '', tagName = '', classContains = '') => {
  const out = []
  const openNeedle = `<${tagName}`
  const closeNeedle = `</${tagName}>`
  let cursor = 0

  while (cursor < block.length) {
    const openStart = block.indexOf(openNeedle, cursor)
    if (openStart === -1) break

    const openEnd = block.indexOf('>', openStart)
    if (openEnd === -1) break

    const openTag = block.slice(openStart, openEnd + 1)
    const selfClose = /\/>$/.test(openTag)
    let endIndex = openEnd + 1

    if (!selfClose) {
      let depth = 1
      let scan = openEnd + 1
      while (depth > 0) {
        const nextOpen = block.indexOf(openNeedle, scan)
        const nextClose = block.indexOf(closeNeedle, scan)
        if (nextClose === -1) break

        if (nextOpen !== -1 && nextOpen < nextClose) {
          depth += 1
          scan = nextOpen + openNeedle.length
        } else {
          depth -= 1
          scan = nextClose + closeNeedle.length
        }
      }
      endIndex = scan
    }

    const classMatch = !classContains || getClassNames(openTag).includes(classContains)
    if (classMatch) {
      out.push(block.slice(openStart, endIndex))
    }

    cursor = endIndex
  }
  return out
}

const getTagBlocksWithPos = (block = '', tagName = '', classContains = '') => {
  const out = []
  const openNeedle = `<${tagName}`
  const closeNeedle = `</${tagName}>`
  let cursor = 0

  while (cursor < block.length) {
    const openStart = block.indexOf(openNeedle, cursor)
    if (openStart === -1) break

    const openEnd = block.indexOf('>', openStart)
    if (openEnd === -1) break

    const openTag = block.slice(openStart, openEnd + 1)
    const selfClose = /\/>$/.test(openTag)
    let endIndex = openEnd + 1

    if (!selfClose) {
      let depth = 1
      let scan = openEnd + 1
      while (depth > 0) {
        const nextOpen = block.indexOf(openNeedle, scan)
        const nextClose = block.indexOf(closeNeedle, scan)
        if (nextClose === -1) break

        if (nextOpen !== -1 && nextOpen < nextClose) {
          depth += 1
          scan = nextOpen + openNeedle.length
        } else {
          depth -= 1
          scan = nextClose + closeNeedle.length
        }
      }
      endIndex = scan
    }

    const classMatch = !classContains || getClassNames(openTag).includes(classContains)
    if (classMatch) {
      out.push({
        start: openStart,
        end: endIndex,
        html: block.slice(openStart, endIndex),
      })
    }

    cursor = endIndex
  }
  return out
}

const getContainerBlock = (html = '', classContains = '', from = 0) => {
  const classNeedle = `class="`
  let start = html.indexOf(classNeedle, from)
  while (start !== -1) {
    const classValueStart = start + classNeedle.length
    const classValueEnd = html.indexOf('"', classValueStart)
    if (classValueEnd === -1) break

    const classValue = html.slice(classValueStart, classValueEnd)
    if (!classValue.includes(classContains)) {
      start = html.indexOf(classNeedle, classValueEnd + 1)
      continue
    }

    const tagOpenStart = html.lastIndexOf('<', start)
    const tagOpenEnd = html.indexOf('>', classValueEnd)
    if (tagOpenStart === -1 || tagOpenEnd === -1) break

    const tagNameMatch = html.slice(tagOpenStart, tagOpenEnd + 1).match(/^<([a-z0-9-]+)/i)
    if (!tagNameMatch) break
    const tagName = tagNameMatch[1]

    const closeTag = `</${tagName}>`
    let cursor = tagOpenEnd + 1
    let depth = 1
    while (depth > 0) {
      const nextOpen = html.indexOf(`<${tagName}`, cursor)
      const nextClose = html.indexOf(closeTag, cursor)
      if (nextClose === -1) break

      if (nextOpen !== -1 && nextOpen < nextClose) {
        depth += 1
        cursor = nextOpen + tagName.length + 1
      } else {
        depth -= 1
        cursor = nextClose + closeTag.length
      }
    }

    return html.slice(tagOpenStart, cursor)
  }
  return ''
}

const parseAnchor = (block = '') => {
  const anchorMatch = block.match(/<a\b[^>]*>[\s\S]*?<\/a>/i)
  if (!anchorMatch) {
    return null
  }

  const tagStart = anchorMatch[0].match(/<a\b[^>]*>/i)
  const href = normalizeUrl(getAttr(tagStart ? tagStart[0] : '', 'href'))
  const title = cleanText(stripTags(anchorMatch[0]))
  return { title, url: href }
}

const parseTopLevel = (html = '') => {
  const level1 = []
  const categoriesBlock = getContainerBlock(html, 'wd-header-details-category')
  const categoryItems = getTagBlocks(categoriesBlock, 'li', 'wd-header-details-category-title')
  const subcategoryListBlock = getContainerBlock(html, 'wd-header-subcategory-list')
  const subcategoryBlocks = getTagBlocks(subcategoryListBlock, 'ul', 'wd-header-details-subcategory')

  categoryItems.forEach((item, index) => {
    const anchor = parseAnchor(item)
    const title = anchor ? anchor.title : cleanText(stripTags(item))
    const subBlock = subcategoryBlocks[index] || ''
    const hasSubcategoryItems = getTagBlocks(subBlock, 'li', 'wd-header-details-subcategory-title').length > 0
    const entry = {
      id: `1-${slugify(title)}`,
      type: hasSubcategoryItems ? 'menu' : 'links',
      title,
    }

    if (anchor && anchor.url) {
      entry.url = anchor.url
    }
    level1.push(entry)
  })

  return level1
}

const parseSecondLevel = (html = '', level1 = []) => {
  const level2 = []
  const subcategoryListBlock = getContainerBlock(html, 'wd-header-subcategory-list')
  const subcategoryBlocks = getTagBlocks(subcategoryListBlock, 'ul', 'wd-header-details-subcategory')
  const productsGroups = getTagBlocks(
    getBlockInner(getContainerBlock(html, 'wd-header-details-products-list')),
    'div',
    'wd-header-details-products',
  )

  subcategoryBlocks.forEach((subBlock, index) => {
    const parent = level1[index]
    if (!parent) return

    const links = getTagBlocks(subBlock, 'li', 'wd-header-details-subcategory-title')
    if (!links.length) {
      if (/more filters/i.test(parent.title)) {
        const relatedProductsGroup = productsGroups[index] || ''
        const nav = getContainerBlock(relatedProductsGroup, 'wd-header-more-fliters-nav')
        const navTitle = cleanText(getTagInner(nav, 'p')) || 'For Outdoor'
        const navLinks = []
        const lis = getTagBlocks(getTagInner(nav, 'ul'), 'li', '')

        lis.forEach((li) => {
          const anchor = parseAnchor(li)
          if (!anchor) return
          navLinks.push({
            title: anchor.title,
            url: anchor.url,
          })
        })

        level2.push({
          id: `2-${slugify(navTitle)}`,
          title: navTitle,
          icon: 'mountain',
          parentId: parent.id,
          parentTitle: parent.title,
          links: navLinks,
        })
      }
      return
    }

    links.forEach((li) => {
      const anchor = parseAnchor(li)
      if (!anchor) return
      level2.push({
        id: `2-${slugify(anchor.title)}`,
        title: anchor.title,
        url: anchor.url,
        footer: [],
        parentId: parent.id,
        parentTitle: parent.title,
      })
    })
  })

  return level2
}

const parseTags = (cardBlock = '') => {
  const tags = []
  const tagItems = getTagBlocks(cardBlock, 'li', '')
  tagItems.forEach((li) => {
    const title = cleanText(stripTags(li))
    if (!title) return
    tags.push({
      title,
      type: li.includes('wd-gpd-tag') ? 'light' : 'dark',
    })
  })
  return tags
}

const parseChildren = (listBlock = '', includeTags = true) => {
  const children = []
  const cards = getTagBlocks(listBlock, 'a', '')

  cards.forEach((card) => {
    const cardOpen = card.match(/<a\b[^>]*>/i)
    const url = normalizeUrl(getAttr(cardOpen ? cardOpen[0] : '', 'href'))
    const title = cleanText(getTagInner(card, 'p')) || cleanText(getAttr(card.match(/<img\b[^>]*>/i)?.[0] || '', 'alt'))
    const imgTag = card.match(/<img\b[^>]*>/i)?.[0] || ''
    const image = normalizeUrl(getAttr(imgTag, 'data-src') || getAttr(imgTag, 'src'))
    const tagsBlock = getContainerBlock(card, 'wd-header-word-tag')
    const tags = parseTags(tagsBlock)

    const child = { title, url, image }
    if (includeTags) {
      child.tags = tags
    }
    children.push(child)
  })

  return children
}

const parseThirdLevel = (html = '', level1 = [], level2 = []) => {
  const level3 = []
  const productsContainer = getContainerBlock(html, 'wd-header-details-products-list')
  const groups = getTagBlocks(getBlockInner(productsContainer), 'div', 'wd-header-details-products')

  const secondLevelByParent = new Map()
  level2.forEach((item) => {
    if (!secondLevelByParent.has(item.parentId)) {
      secondLevelByParent.set(item.parentId, [])
    }
    secondLevelByParent.get(item.parentId).push(item)
  })

  groups.forEach((group, groupIndex) => {
    const parentLevel1 = level1[groupIndex]
    if (!parentLevel1) return
    const relatedLevel2 = secondLevelByParent.get(parentLevel1.id) || []
    const items = getTagBlocks(getBlockInner(group), 'div', 'wd-header-details-products-item')

    items.forEach((item, itemIndex) => {
      const parentLevel2 = relatedLevel2[itemIndex]
      if (!parentLevel2 || parentLevel2.links) return

      const itemInner = getBlockInner(item)
      const titleBlocks = getTagBlocksWithPos(itemInner, 'div', 'wd-header-product-list-title')
      const listBlocks = [
        ...getTagBlocksWithPos(itemInner, 'div', 'wd-header-product-list'),
        ...getTagBlocksWithPos(itemInner, 'ul', 'wd-header-product-list'),
      ].sort((a, b) => a.start - b.start)

      titleBlocks.forEach((titleEntry, index) => {
        const nextTitleStart = titleBlocks[index + 1]?.start ?? Number.POSITIVE_INFINITY
        const listEntry = listBlocks.find((candidate) => candidate.start > titleEntry.start && candidate.start < nextTitleStart)
        if (!listEntry) return

        const titleBlock = titleEntry.html
        const listBlock = listEntry.html

        const sectionTitle = cleanText(getTagInner(titleBlock, 'p'))
        const shopAllAnchor = titleBlock.match(/<a\b[^>]*>[\s\S]*?<\/a>/i)?.[0] || ''
        const shopAllOpenTag = shopAllAnchor.match(/<a\b[^>]*>/i)?.[0] || ''
        const url = normalizeUrl(getAttr(shopAllOpenTag, 'href'))
        const type = /wd-header-product-list product/.test(listBlock) ? 'products' : 'series'
        const children = parseChildren(listBlock, type === 'products')

        level3.push({
          id: `3-${slugify(sectionTitle)}-${slugify(parentLevel2.title)}`,
          title: sectionTitle,
          children,
          parentId: parentLevel2.id,
          parentTitle: parentLevel2.title,
          url,
          type,
        })
      })
    })
  })

  return level3
}

const main = () => {
  const input = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_INPUT
  const output = process.argv[3] ? path.resolve(process.argv[3]) : DEFAULT_OUTPUT

  if (!fs.existsSync(input)) {
    console.error(`input not found: ${input}`)
    process.exit(1)
  }

  const rawHtml = fs.readFileSync(input, 'utf8')
  const html = rawHtml.replace(/<!--[\s\S]*?-->/g, '')
  const level_1 = parseTopLevel(html)
  const level_2 = parseSecondLevel(html, level_1)
  const level_3 = parseThirdLevel(html, level_1, level_2)

  const data = {
    level_1,
    level_2,
    level_3,
  }

  fs.writeFileSync(output, `${JSON.stringify(data, null, 2)}\n`, 'utf8')
  console.log(`generated: ${output}`)
  console.log(`level_1=${level_1.length}, level_2=${level_2.length}, level_3=${level_3.length}`)
}

main()
