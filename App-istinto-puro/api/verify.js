async function getTeamId(teamName) {
  const url = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(teamName)}&language=it&format=json&type=item`;

  const res = await fetch(url);
  const data = await res.json();

  if (!data.search || data.search.length === 0) return null;

  return data.search[0].id;
}

function buildSparqlQuery(teamIds) {
  const teamFilters = teamIds
    .map(id => `?player wdt:P54 wd:${id} .`)
    .join('\n');

  return `
    SELECT ?player ?playerLabel WHERE {
      ?player wdt:P31 wd:Q5 .
      ?player wdt:P106 wd:Q937857 .

      ${teamFilters}

      SERVICE wikibase:label { bd:serviceParam wikibase:language "it,en". }
    }
    LIMIT 5
  `;
}

async function getWikipediaLink(qid) {
  const url = `https://www.wikidata.org/wiki/Special:EntityData/${qid}.json`;
  const res = await fetch(url);
  const data = await res.json();

  const entity = data.entities[qid];

  if (entity.sitelinks.itwiki) {
    return `https://it.wikipedia.org/wiki/${entity.sitelinks.itwiki.title.replace(/ /g, '_')}`;
  }

  if (entity.sitelinks.enwiki) {
    return `https://en.wikipedia.org/wiki/${entity.sitelinks.enwiki.title.replace(/ /g, '_')}`;
  }

  return `https://www.wikidata.org/wiki/${qid}`;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  try {
    const { teams } = req.body;

    if (!teams || !Array.isArray(teams) || teams.length === 0) {
      return res.status(400).json({ error: "Teams mancanti." });
    }

    const teamIds = [];

    for (const team of teams) {
      const id = await getTeamId(team);
      if (!id) {
        return res.status(400).json({ error: `Squadra non trovata: ${team}` });
      }
      teamIds.push(id);
    }

    const sparqlQuery = buildSparqlQuery(teamIds);

    const sparqlRes = await fetch("https://query.wikidata.org/sparql", {
      method: "POST",
      headers: {
        "Content-Type": "application/sparql-query",
        "Accept": "application/sparql-results+json"
      },
      body: sparqlQuery
    });

    const sparqlData = await sparqlRes.json();

    const risultati = [];

    for (const item of sparqlData.results.bindings) {
      const qid = item.player.value.split('/').pop();
      const wikiLink = await getWikipediaLink(qid);

      risultati.push({
        nome: item.playerLabel.value,
        wikidata_url: wikiLink
      });
    }

    return res.status(200).json({ calciatori: risultati });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
