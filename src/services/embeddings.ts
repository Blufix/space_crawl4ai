import OpenAI from 'openai';

const openaiApiKey = import.meta.env.VITE_OPENAI_API_KEY || '';

class EmbeddingsService {
  private client: OpenAI | null = null;

  constructor() {
    if (openaiApiKey) {
      this.client = new OpenAI({
        apiKey: openaiApiKey,
        dangerouslyAllowBrowser: true // Note: In production, embeddings should be generated server-side
      });
    }
  }

  private estimateTokens(text: string): number {
    // More accurate token estimation
    // Count words, punctuation, and special characters separately
    const words = text.split(/\s+/).length;
    const punctuation = (text.match(/[.,;:!?()[\]{}"'-]/g) || []).length;
    const whitespace = (text.match(/\s/g) || []).length;
    
    // Rough formula: words + punctuation + whitespace/4
    return Math.ceil(words + punctuation + whitespace / 4);
  }

  private chunkText(text: string, maxTokens: number = 4500): string[] {
    // Use token estimation instead of character count
    if (this.estimateTokens(text) <= maxTokens) {
      return [text];
    }

    const chunks: string[] = [];
    let currentChunk = '';
    
    // Split by paragraphs first, then sentences if needed
    const paragraphs = text.split('\n\n');
    
    for (const paragraph of paragraphs) {
      const testChunk = currentChunk + (currentChunk ? '\n\n' : '') + paragraph;
      if (this.estimateTokens(testChunk) <= maxTokens) {
        currentChunk = testChunk;
      } else {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
          currentChunk = '';
        }
        
        // If paragraph itself is too long, split by sentences
        if (this.estimateTokens(paragraph) > maxTokens) {
          const sentences = paragraph.split(/[.!?]+/);
          for (const sentence of sentences) {
            const testSentence = currentChunk + (currentChunk ? '. ' : '') + sentence;
            if (this.estimateTokens(testSentence) <= maxTokens) {
              currentChunk = testSentence;
            } else {
              if (currentChunk) {
                chunks.push(currentChunk.trim());
                currentChunk = '';
              }
              // If sentence is still too long, force split by words
              if (this.estimateTokens(sentence) > maxTokens) {
                const words = sentence.split(' ');
                for (const word of words) {
                  const testWord = currentChunk + (currentChunk ? ' ' : '') + word;
                  if (this.estimateTokens(testWord) <= maxTokens) {
                    currentChunk = testWord;
                  } else {
                    if (currentChunk) {
                      chunks.push(currentChunk.trim());
                      currentChunk = word;
                    } else {
                      currentChunk = word;
                    }
                  }
                }
              } else {
                currentChunk = sentence;
              }
            }
          }
        } else {
          currentChunk = paragraph;
        }
      }
    }
    
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }
    
    return chunks.filter(chunk => chunk.length > 0);
  }

  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.client) {
      throw new Error('OpenAI API key not configured. Please add VITE_OPENAI_API_KEY to your .env file.');
    }

    try {
      console.log('Generating embedding for text:', text.substring(0, 100) + '...');
      console.log('Text length:', text.length, 'characters');
      
      // Check if text is too long and needs chunking
      const chunks = this.chunkText(text);
      
      if (chunks.length > 1) {
        console.log(`📄 Text too long, split into ${chunks.length} chunks`);
        
        // Generate embeddings for each chunk
        const chunkEmbeddings: number[][] = [];
        for (let i = 0; i < chunks.length; i++) {
          const estimatedTokens = this.estimateTokens(chunks[i]);
          console.log(`🔄 Processing chunk ${i + 1}/${chunks.length} (${chunks[i].length} chars, ~${estimatedTokens} tokens)`);
          
          // Final safety check - if still too large, truncate
          let chunkText = chunks[i];
          if (estimatedTokens > 7000) {
            console.log(`⚠️ Chunk ${i + 1} still too large (${estimatedTokens} tokens), truncating...`);
            // Truncate to approximately 6000 tokens worth of text
            const maxChars = 6000 * 3; // Conservative estimate
            chunkText = chunkText.substring(0, maxChars);
            console.log(`✂️ Truncated to ${chunkText.length} chars (~${this.estimateTokens(chunkText)} tokens)`);
          }
          
          const response = await this.client.embeddings.create({
            model: 'text-embedding-3-small',
            input: chunkText,
            encoding_format: 'float',
          });
          
          chunkEmbeddings.push(response.data[0].embedding);
        }
        
        // Average the embeddings (simple approach)
        const avgEmbedding = new Array(chunkEmbeddings[0].length).fill(0);
        for (const embedding of chunkEmbeddings) {
          for (let i = 0; i < embedding.length; i++) {
            avgEmbedding[i] += embedding[i];
          }
        }
        
        // Normalize by number of chunks
        for (let i = 0; i < avgEmbedding.length; i++) {
          avgEmbedding[i] /= chunkEmbeddings.length;
        }
        
        console.log('✅ Generated averaged embedding from', chunks.length, 'chunks, dimensions:', avgEmbedding.length);
        return avgEmbedding;
      } else {
        // Single chunk - normal processing with safety check
        const estimatedTokens = this.estimateTokens(text);
        console.log(`📄 Single chunk processing (~${estimatedTokens} tokens)`);
        
        let inputText = text;
        if (estimatedTokens > 7000) {
          console.log(`⚠️ Single chunk too large (${estimatedTokens} tokens), truncating...`);
          // Truncate to approximately 6000 tokens worth of text
          const maxChars = 6000 * 3; // Conservative estimate
          inputText = text.substring(0, maxChars);
          console.log(`✂️ Truncated to ${inputText.length} chars (~${this.estimateTokens(inputText)} tokens)`);
        }
        
        const response = await this.client.embeddings.create({
          model: 'text-embedding-3-small',
          input: inputText,
          encoding_format: 'float',
        });

        const embedding = response.data[0].embedding;
        console.log('✅ Generated embedding with dimensions:', embedding.length);
        
        return embedding;
      }
    } catch (error) {
      console.error('Failed to generate embedding:', error);
      throw new Error(`Embedding generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    if (!this.client) {
      throw new Error('OpenAI API key not configured. Please add VITE_OPENAI_API_KEY to your .env file.');
    }

    try {
      console.log('Generating embeddings for', texts.length, 'texts');
      
      const response = await this.client.embeddings.create({
        model: 'text-embedding-3-small',
        input: texts,
        encoding_format: 'float',
      });

      const embeddings = response.data.map(item => item.embedding);
      console.log('✅ Generated', embeddings.length, 'embeddings');
      
      return embeddings;
    } catch (error) {
      console.error('Failed to generate embeddings:', error);
      throw new Error(`Batch embedding generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  isConfigured(): boolean {
    return !!this.client;
  }

  async testConnection(): Promise<{ success: boolean; message: string; details?: any }> {
    if (!this.client) {
      return {
        success: false,
        message: 'OpenAI API key not configured'
      };
    }

    try {
      // Test with a small sample
      const testEmbedding = await this.generateEmbedding('Hello, world!');
      
      return {
        success: true,
        message: `Connected successfully! Generated test embedding with ${testEmbedding.length} dimensions.`,
        details: { dimensions: testEmbedding.length, model: 'text-embedding-3-small' }
      };
    } catch (error) {
      return {
        success: false,
        message: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: error
      };
    }
  }
}

export const embeddingsService = new EmbeddingsService();