import { pipeline } from '@huggingface/transformers'

// Singleton pipeline instance
let titlePipeline: any = null

/**
 * Initialize the title generation model
 * Called once during app startup
 */
export async function initializeTitleGenerator() {
  try {
    titlePipeline = await pipeline(
      'text2text-generation',
      'Dafilab/chat-title-generator'
    )
  } catch (error) {
    console.error('Failed to initialize title generator:', error)
  }
}

/**
 * Fallback title generation using simple heuristics
 */
function generateTitleFallback(message: string): string {
  // Clean and extract key words
  const cleaned = message
    .replace(/^(hey|hi|hello|please|can you|could you|help me|what|how|why)/i, '')
    .replace(/[\n\r]+/g, ' ')
    .trim()
  
  const words = cleaned.split(' ').filter(w => w.length > 2)
  const title = words.slice(0, 4).join(' ').slice(0, 24)
  
  return title
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ') || 'New Chat'
}

/**
 * Generate a concise title from a message
 */
export async function generateTitle(message: string): Promise<string> {

  // If model isn't loaded, use fallback
  if (!titlePipeline) {
    return generateTitleFallback(message)
  }

  try {
    const prompt = `short title: ${message.slice(0, 200).replace(/[\n\r]+/g, ' ').trim()}`
    
    const output = await titlePipeline(prompt, {
      max_new_tokens: 8,
      temperature: 0.2,
      num_beams: 4,
      early_stopping: true,
      do_sample: false,
      length_penalty: 2.0,
    })

    if (!output?.[0]?.generated_text) {
      return generateTitleFallback(message)
    }

    // Clean up the output
    let title = output[0].generated_text
      .trim()
      .replace(/^["']|["']$/g, '')
      .replace(/^(title:|short title:|the |a |an )/i, '')
      .replace(/\.+$/, '')
      .trim()

    // Capitalize first letter
    if (title.length > 0) {
      title = title.charAt(0).toUpperCase() + title.slice(1)
    }

    // Validate result
    if (!title || title.length < 3 || /^(chat|message|text|new chat)$/i.test(title)) {
      return generateTitleFallback(message)
    }

    // Truncate if needed
    if (title.length > 24) {
      const words = title.split(' ')
      title = words.slice(0, 4).join(' ')
      if (title.length > 24) {
        title = title.substring(0, 24).trim()
      }
    }

    return title
  } catch (error) {
    console.error('Error generating title:', error)
    return generateTitleFallback(message)
  }
}