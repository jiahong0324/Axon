import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

const DEFAULT_TITLE = 'Axon - Your Academic Life, Finally Organized'
const DEFAULT_DESC = 'Axon brings your timetable, assignments, exams, and notes into one beautiful, AI-powered student dashboard. Plan your week, track coursework, and boost productivity.'
const DEFAULT_IMAGE = 'https://axon-com.vercel.app/icons/logo.png'
const DOMAIN = 'https://axon-com.vercel.app'

function setOrCreateMeta(attrName, attrValue, content) {
  let element = document.querySelector(`meta[${attrName}="${attrValue}"]`)
  if (!element) {
    element = document.createElement('meta')
    element.setAttribute(attrName, attrValue)
    document.head.appendChild(element)
  }
  element.setAttribute('content', content)
}

function setOrCreateLink(rel, href) {
  let element = document.querySelector(`link[rel="${rel}"]`)
  if (!element) {
    element = document.createElement('link')
    element.setAttribute('rel', rel)
    document.head.appendChild(element)
  }
  element.setAttribute('href', href)
}

export default function SEO({
  title,
  description = DEFAULT_DESC,
  keywords = 'student planner, academic dashboard, timetable app, assignment tracker, exam countdown, AI study helper, university student productivity',
  image = DEFAULT_IMAGE,
  canonical,
  type = 'website'
}) {
  const location = useLocation()
  const pageTitle = title ? (title.includes('Axon') ? title : `${title} | Axon`) : DEFAULT_TITLE
  const pageUrl = canonical || `${DOMAIN}${location.pathname}`

  useEffect(() => {
    // Document Title
    document.title = pageTitle

    // Standard Meta
    setOrCreateMeta('name', 'description', description)
    setOrCreateMeta('name', 'keywords', keywords)

    // Canonical
    setOrCreateLink('canonical', pageUrl)

    // Open Graph
    setOrCreateMeta('property', 'og:title', pageTitle)
    setOrCreateMeta('property', 'og:description', description)
    setOrCreateMeta('property', 'og:url', pageUrl)
    setOrCreateMeta('property', 'og:image', image)
    setOrCreateMeta('property', 'og:type', type)

    // Twitter Card
    setOrCreateMeta('name', 'twitter:title', pageTitle)
    setOrCreateMeta('name', 'twitter:description', description)
    setOrCreateMeta('name', 'twitter:image', image)
    setOrCreateMeta('name', 'twitter:card', 'summary')
  }, [pageTitle, description, keywords, pageUrl, image, type])

  return null
}
