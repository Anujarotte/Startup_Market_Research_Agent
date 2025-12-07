import React, { useState } from 'react';
import { Search, Download, Loader2, TrendingUp, Users, DollarSign, Target } from 'lucide-react';

const MarketResearchAgent = () => {
  const [startupDesc, setStartupDesc] = useState('');
  const [researchQuery, setResearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');

  const presetQueries = [
    "Find top 5 competitors and compare pricing & features",
    "Summarize customer pain points from reviews and blogs",
    "Suggest a unique positioning strategy for our startup"
  ];

  const conductResearch = async () => {
    if (!startupDesc || !researchQuery) {
      setError('Please provide both startup description and research query');
      return;
    }

    setLoading(true);
    setError('');
    setResults(null);

    try {
      // Step 1: Web Search for competitors
      const searchQuery = `${startupDesc} ${researchQuery}`;
      
      const systemPrompt = `You are an expert startup market research analyst. Analyze the market research query and provide:
1. Market Overview (2-3 paragraphs)
2. Competitor Analysis Table (markdown format with columns: Company, Website, Pricing, Key Features, Target Market, USP)
3. Customer Pain Points (bullet list)
4. Strategic Recommendations (3-5 specific, actionable recommendations)
5. Pitch Deck Outline (5 key slides with titles and 2-3 bullet points each)

Be specific, data-driven, and actionable. Format your response with clear sections using markdown headers.`;

      const userPrompt = `Startup Description: ${startupDesc}

Research Query: ${researchQuery}

Please conduct comprehensive market research and provide detailed insights following the structure outlined.`;

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4000,
          temperature: 0.7,
          system: systemPrompt,
          messages: [
            { 
              role: 'user', 
              content: userPrompt 
            }
          ],
          tools: [
            {
              type: "web_search_20250305",
              name: "web_search"
            }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      
      // Extract text from response
      let researchText = '';
      let toolCalls = [];
      
      for (const block of data.content) {
        if (block.type === 'text') {
          researchText += block.text + '\n';
        } else if (block.type === 'tool_use') {
          toolCalls.push(block);
        }
      }

      // If tool was used, we might need to continue the conversation
      if (toolCalls.length > 0 && data.stop_reason === 'tool_use') {
        // For this demo, we'll make a second call with tool results
        const toolResults = toolCalls.map(tool => ({
          type: 'tool_result',
          tool_use_id: tool.id,
          content: 'Web search completed. Please analyze the results and provide the research report.'
        }));

        const followUpResponse = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 4000,
            system: systemPrompt,
            messages: [
              { role: 'user', content: userPrompt },
              { role: 'assistant', content: data.content },
              { role: 'user', content: toolResults }
            ]
          })
        });

        const followUpData = await followUpResponse.json();
        researchText = followUpData.content
          .filter(block => block.type === 'text')
          .map(block => block.text)
          .join('\n');
      }

      // Parse the research into sections
      const parsedResults = parseResearchResults(researchText);
      setResults(parsedResults);

    } catch (err) {
      setError(`Research failed: ${err.message}`);
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const parseResearchResults = (text) => {
    const sections = {
      overview: '',
      competitors: '',
      painPoints: '',
      recommendations: '',
      pitchOutline: '',
      rawText: text
    };

    // Simple parsing based on common headers
    const overviewMatch = text.match(/##?\s*Market\s+Overview[\s\S]*?(?=##?\s*Competitor|##?\s*Customer|$)/i);
    const competitorMatch = text.match(/##?\s*Competitor[\s\S]*?(?=##?\s*Customer|##?\s*Strategic|$)/i);
    const painPointsMatch = text.match(/##?\s*Customer\s+Pain[\s\S]*?(?=##?\s*Strategic|##?\s*Pitch|$)/i);
    const recommendationsMatch = text.match(/##?\s*Strategic[\s\S]*?(?=##?\s*Pitch|$)/i);
    const pitchMatch = text.match(/##?\s*Pitch[\s\S]*$/i);

    if (overviewMatch) sections.overview = overviewMatch[0].trim();
    if (competitorMatch) sections.competitors = competitorMatch[0].trim();
    if (painPointsMatch) sections.painPoints = painPointsMatch[0].trim();
    if (recommendationsMatch) sections.recommendations = recommendationsMatch[0].trim();
    if (pitchMatch) sections.pitchOutline = pitchMatch[0].trim();

    return sections;
  };

  const downloadReport = () => {
    if (!results) return;

    const reportText = `MARKET RESEARCH REPORT
Generated: ${new Date().toLocaleDateString()}

Startup: ${startupDesc}
Query: ${researchQuery}

${results.rawText}
`;

    const blob = new Blob([reportText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'market-research-report.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderMarkdown = (text) => {
    if (!text) return null;
    
    // Simple markdown rendering
    return text.split('\n').map((line, idx) => {
      if (line.startsWith('###')) {
        return <h3 key={idx} className="text-lg font-semibold mt-4 mb-2 text-gray-800">{line.replace(/^###\s*/, '')}</h3>;
      } else if (line.startsWith('##')) {
        return <h2 key={idx} className="text-xl font-bold mt-6 mb-3 text-gray-900">{line.replace(/^##\s*/, '')}</h2>;
      } else if (line.startsWith('|')) {
        return <div key={idx} className="font-mono text-sm my-1 text-gray-700">{line}</div>;
      } else if (line.startsWith('- ') || line.startsWith('* ')) {
        return <li key={idx} className="ml-6 my-1 text-gray-700">{line.replace(/^[-*]\s*/, '')}</li>;
      } else if (line.match(/^\d+\./)) {
        return <li key={idx} className="ml-6 my-1 list-decimal text-gray-700">{line.replace(/^\d+\.\s*/, '')}</li>;
      } else if (line.trim()) {
        return <p key={idx} className="my-2 text-gray-700">{line}</p>;
      }
      return <br key={idx} />;
    });
  };

  return (
<div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-8 h-8 text-indigo-600" />
            <h1 className="text-3xl font-bold text-gray-900">Startup Market Research Agent</h1>
          </div>
          <p className="text-gray-600">AI-powered market intelligence for founders and product teams</p>
        </div>

        {/* Input Section */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Startup Description
              </label>
              <textarea
                value={startupDesc}
                onChange={(e) => setStartupDesc(e.target.value)}
                placeholder="e.g., We are building an AI-powered energy monitoring platform for SMEs in India..."
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Research Query
              </label>
              <textarea
                value={researchQuery}
                onChange={(e) => setResearchQuery(e.target.value)}
                placeholder="What would you like to research?"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                rows={2}
              />
            </div>

            {/* Preset Queries */}
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">Quick Queries:</p>
              <div className="flex flex-wrap gap-2">
                {presetQueries.map((query, idx) => (
                  <button
                    key={idx}
                    onClick={() => setResearchQuery(query)}
                    className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm hover:bg-indigo-200 transition"
                  >
                    {query}
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={conductResearch}
                disabled={loading || !startupDesc || !researchQuery}
                className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition font-semibold"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Researching...
                  </>
                ) : (
                  <>
                    <Search className="w-5 h-5" />
                    Conduct Research
                  </>
                )}
              </button>

              {results && (
                <button
                  onClick={downloadReport}
                  className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold"
                >
                  <Download className="w-5 h-5" />
                  Download Report
                </button>
              )}
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                {error}
              </div>
            )}
          </div>
        </div>

        {/* Results Section */}
        {results && (
          <div className="space-y-6">
            {/* Market Overview */}
            {results.overview && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Target className="w-6 h-6 text-indigo-600" />
                  <h2 className="text-2xl font-bold text-gray-900">Market Overview</h2>
                </div>
                <div className="prose max-w-none">
                  {renderMarkdown(results.overview)}
                </div>
              </div>
            )}

            {/* Competitor Analysis */}
            {results.competitors && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Users className="w-6 h-6 text-indigo-600" />
                  <h2 className="text-2xl font-bold text-gray-900">Competitor Analysis</h2>
                </div>
                <div className="prose max-w-none overflow-x-auto">
                  {renderMarkdown(results.competitors)}
                </div>
              </div>
            )}

            {/* Pain Points */}
            {results.painPoints && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                  <DollarSign className="w-6 h-6 text-indigo-600" />
                  <h2 className="text-2xl font-bold text-gray-900">Customer Pain Points</h2>
                </div>
                <div className="prose max-w-none">
                  {renderMarkdown(results.painPoints)}
                </div>
              </div>
            )}

            {/* Strategic Recommendations */}
            {results.recommendations && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                  <h2 className="text-2xl font-bold text-gray-900">Strategic Recommendations</h2>
                </div>
                <div className="prose max-w-none">
                  {renderMarkdown(results.recommendations)}
                </div>
              </div>
            )}

            {/* Pitch Outline */}
            {results.pitchOutline && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Search className="w-6 h-6 text-purple-600" />
                  <h2 className="text-2xl font-bold text-gray-900">Pitch Deck Outline</h2>
                </div>
                <div className="prose max-w-none">
                  {renderMarkdown(results.pitchOutline)}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {!results && !loading && (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">Ready to Research</h3>
            <p className="text-gray-500">Enter your startup details and research query to get started</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MarketResearchAgent;