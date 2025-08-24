// Test script for AI span tracking with Sentry
require('./instrument.js'); // Initialize Sentry first

const { withAISpan, withAgentSpan } = require('./ai-span-utils-simple.js');

console.log('🤖 Testing AI Span Tracking with Sentry...\n');

async function testBasicAISpan() {
  console.log('1. Testing basic AI span tracking...');
  
  try {
    const result = await withAISpan('gpt-4o', 'Generate Test Content', async (span) => {
      // Simulate AI processing
      span.setAttribute('ai.input_tokens', 150);
      span.setAttribute('ai.temperature', 0.7);
      span.setAttribute('ai.max_tokens', 500);
      
      console.log('   - Making AI API call...');
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Simulate response
      const response = {
        content: 'This is AI-generated test content for SMM Architect',
        tokensUsed: 75
      };
      
      span.setAttribute('ai.output_tokens', response.tokensUsed);
      span.setAttribute('ai.output_length', response.content.length);
      
      console.log('   ✅ AI call completed successfully');
      return response;
    });
    
    console.log(`   📊 Generated content: \"${result.content.substring(0, 50)}...\"`);
    console.log(`   📈 Tokens used: ${result.tokensUsed}\n`);
    
  } catch (error) {
    console.error('   ❌ Error in basic AI span:', error.message);
  }
}

async function testAgentSpan() {
  console.log('2. Testing agent-specific span tracking...');
  
  try {
    const result = await withAgentSpan(
      'creative-agent',
      'gpt-4o',
      'Create Social Media Post',
      async (span) => {
        // Agent-specific attributes
        span.setAttribute('agent.task_complexity', 'medium');
        span.setAttribute('agent.platform', 'twitter');
        span.setAttribute('agent.content_type', 'promotional');
        
        console.log('   - Creative agent analyzing requirements...');
        await new Promise(resolve => setTimeout(resolve, 300));
        
        console.log('   - Generating platform-specific content...');
        await new Promise(resolve => setTimeout(resolve, 700));
        
        console.log('   - Applying brand guidelines...');
        await new Promise(resolve => setTimeout(resolve, 200));
        
        const result = {
          post: 'Exciting news! 🚀 Our AI-powered SMM Architect is revolutionizing social media marketing! #Innovation #AI #Marketing',
          hashtags: ['#Innovation', '#AI', '#Marketing'],
          engagement_prediction: 0.85
        };
        
        span.setAttribute('agent.hashtags_generated', result.hashtags.length);
        span.setAttribute('agent.engagement_prediction', result.engagement_prediction);
        
        console.log('   ✅ Agent task completed successfully');
        return result;
      }
    );
    
    console.log(`   📱 Generated post: \"${result.post}\"`);
    console.log(`   🏷️  Hashtags: ${result.hashtags.join(', ')}`);
    console.log(`   📊 Engagement prediction: ${(result.engagement_prediction * 100).toFixed(1)}%\n`);
    
  } catch (error) {
    console.error('   ❌ Error in agent span:', error.message);
  }
}

async function testErrorHandling() {
  console.log('3. Testing error handling in AI spans...');
  
  try {
    await withAISpan('gpt-4o', 'Test Error Handling', async (span) => {
      span.setAttribute('ai.test_scenario', 'rate_limit_error');
      
      console.log('   - Simulating AI API rate limit error...');
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Simulate an API error
      throw new Error('API rate limit exceeded - please try again later');
    });
    
  } catch (error) {
    console.log('   ✅ Error correctly captured and tracked');
    console.log(`   📊 Error details: ${error.message}\n`);
  }
}

async function testMultiStepWorkflow() {
  console.log('4. Testing multi-step agent workflow...');
  
  try {
    const workflowResult = await withAgentSpan(
      'workflow-orchestrator',
      'gpt-4o',
      'Complete Campaign Creation',
      async (workflowSpan) => {
        workflowSpan.setAttribute('workflow.steps', 3);
        workflowSpan.setAttribute('workflow.campaign_type', 'product_launch');
        
        const results = {};
        
        // Step 1: Research
        console.log('   - Step 1: Research agent analyzing market...');
        results.research = await withAISpan('gpt-4o', 'Market Research', async (span) => {
          span.setAttribute('research.market', 'social_media_tools');
          await new Promise(resolve => setTimeout(resolve, 600));
          return { competitors: 3, opportunities: 5, threats: 2 };
        });
        
        // Step 2: Planning
        console.log('   - Step 2: Planner agent creating strategy...');
        results.strategy = await withAISpan('gpt-4o', 'Strategy Planning', async (span) => {
          span.setAttribute('planning.based_on_research', true);
          await new Promise(resolve => setTimeout(resolve, 500));
          return { channels: ['twitter', 'linkedin'], budget: 5000, duration: '2_weeks' };
        });
        
        // Step 3: Content Creation
        console.log('   - Step 3: Creative agent generating content...');
        results.content = await withAISpan('gpt-4o', 'Content Generation', async (span) => {
          span.setAttribute('content.channels', results.strategy.channels.length);
          await new Promise(resolve => setTimeout(resolve, 800));
          return { posts: 14, images: 7, videos: 2 };
        });
        
        workflowSpan.setAttribute('workflow.research_score', 8.5);
        workflowSpan.setAttribute('workflow.total_content_pieces', 
          results.content.posts + results.content.images + results.content.videos);
        
        console.log('   ✅ Complete workflow finished successfully');
        return results;
      }
    );
    
    console.log('   📋 Workflow Results:');
    console.log(`      - Market opportunities: ${workflowResult.research.opportunities}`);
    console.log(`      - Target channels: ${workflowResult.strategy.channels.join(', ')}`);
    console.log(`      - Content pieces: ${workflowResult.content.posts + workflowResult.content.images + workflowResult.content.videos}`);
    
  } catch (error) {
    console.error('   ❌ Error in workflow:', error.message);
  }
}

// Run all tests
async function runAllTests() {
  console.log('🎯 SMM Architect - AI Span Tracking Demo');
  console.log('==========================================\n');
  
  await testBasicAISpan();
  await testAgentSpan();
  await testErrorHandling();
  await testMultiStepWorkflow();
  
  console.log('\n🎉 All tests completed!');
  console.log('📊 Check your Sentry dashboard for detailed AI performance metrics');
  console.log('🔗 Sentry Dashboard: https://sentry.io/organizations/your-org/projects/');
  
  // Flush Sentry events
  const Sentry = require('@sentry/node');
  await Sentry.close(2000);
  
  process.exit(0);
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled promise rejection:', error);
  process.exit(1);
});

// Run the tests
runAllTests().catch(console.error);