const fs = require('fs');
const readline = require('readline');

const logPath = 'C:/Users/HP/.gemini/antigravity/brain/c37e4e7a-a88d-473f-8063-55571da0fd0f/.system_generated/logs/overview.txt';

async function extract() {
  const fileStream = fs.createReadStream(logPath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let fileContent = [];
  
  for await (let line of rl) {
    if (line.startsWith('> ')) line = line.substring(2);
    if (line.startsWith('  ')) line = line.substring(2);
    
    try {
      const parsed = JSON.parse(line);
      // It's usually in a response: {"step_index":..., "tool_responses":[{"call_id":..., "name":"view_file", "response":{"output":"...Showing lines 30 to 240\n1: ...\n2: ..."}}]}
      if (parsed.tool_responses) {
        for (const resp of parsed.tool_responses) {
          if (resp.name === 'view_file' && resp.response && resp.response.output && resp.response.output.includes('DashboardPage.tsx')) {
            const output = resp.response.output;
            const lines = output.split('\n');
            let isCode = false;
            for (const l of lines) {
              if (l.match(/^\d+:/)) {
                fileContent.push(l);
              }
            }
          }
        }
      }
    } catch (e) {
      // Ignore parse errors
    }
  }

  // FileContent now has lines like "100: <Box..."
  // Sort and remove duplicates by line number
  const uniqueLines = {};
  for (const l of fileContent) {
    const match = l.match(/^(\d+):\s(.*)/);
    if (match) {
      uniqueLines[parseInt(match[1])] = match[2];
    }
  }

  const sortedKeys = Object.keys(uniqueLines).map(Number).sort((a, b) => a - b);
  let finalContent = '';
  for (const k of sortedKeys) {
    finalContent += uniqueLines[k] + '\n';
  }

  fs.writeFileSync('C:/Users/HP/OneDrive/Desktop/onlok/frontend/recovered_dashboard.tsx', finalContent);
  console.log('Successfully recovered ' + sortedKeys.length + ' lines.');
}

extract();
