const dotenv = require('dotenv');
const natural = require('natural');
const emotions = require('./emotions.json');
const stemmer = natural.PorterStemmer;

dotenv.config({path: 'src/server/.env'}); 

function tokenizeAndStemText(text) {
  //Tokenizes and stems every word in the text
  return new natural.WordTokenizer().tokenize(text).map(token => stemmer.stem(token));
}

function classifyText(text) {
  var stemmedWords = tokenizeAndStemText(text); 
  var emotionScores = {};

  for (var emotion of Object.keys(emotions)) {
    emotionScores[emotion] = 0; //Initialize all emotions to have 0 count
    for (var word of stemmedWords) { //For every word in the text
      if (emotions[emotion].includes(word)) //If that word is in a emotion category
        emotionScores[emotion] = emotionScores[emotion] + 1; //Add it to the emotion's score
    }
  }
  let maxScore = -1;
  let userEmotion;
  for (var emotions of Object.keys(emotionScores)) { //Go through scores
    if (emotionScores[emotions] > maxScore) { //Find the emotion with the highest score
      userEmotion = emotions;
      maxScore = emotionScores[emotions];
    }
  }
  // for (var emotion of Object.keys(emotionScores)){
  //   console.log(emotionScores[emotion])
  // }
  return userEmotion;
}

async function searchTracks(valence, energy, sortFeature) {
  var accessToken = await getAccessToken(); //Get Spotify API Access Token
  var apiLink = `https://api.spotify.com/v1/recommendations?seed_genres=pop&target_valence_min=${valence[0]}&target_valence_max=${valence[1]}&target_energy_min=${energy[0]}&target_energy_max=${energy[1]}&limit=25&sort=${sortFeature}:desc`;
  var response = await fetch(apiLink, {
    method: 'GET',
    headers: {
      'Authorization': 'Bearer ' + accessToken,
    },
    //https://developer.spotify.com/documentation/web-api/concepts/access-token
    //https://developer.spotify.com/documentation/web-api/reference/get-recommendations
  });

  var data = await response.json();
  return data.tracks.map((track) => ({ //For every track, display artist, song name, and Spotify URL
    artist: track.artists[0].name,
    song: track.name,
    externalUrls: track.external_urls,
  }));  
}

async function getAccessToken() { //Adapted from https://developer.spotify.com/documentation/web-api/tutorials/client-credentials-flow
  var authOptions = await fetch("https://accounts.spotify.com/api/token", {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + (new Buffer.from(process.env.CLIENT_ID + ':' + process.env.CLIENT_SECRET, 'binary').toString('base64')),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
    // form: {
    //   grant_type: 'client_credentials'
    // },
  });
  var data = await authOptions.json();
  return data.access_token;
}

async function main(userText){
  console.log(userText);
  const emotion = classifyText(userText);
  console.log('Emotion:', emotion);
  let rangeValence;
  let rangeEnergy;
  let sortValue;
  if (emotion == "Happy"){
    rangeValence = [0.9,1.0]
    rangeEnergy = [0.4,0.6]
    sortValue = 'valence'
  }
  else if (emotion == "Sad"){
    rangeValence = [0.0,0.1]
    rangeEnergy = [0.0,0.1]
    sortValue = 'valence'
  }
  else if (emotion == "Anger"){
    rangeValence = [0.4,0.6]
    rangeEnergy = [0.9,1.0]
    sortValue = 'energy'
  }
  else{
    rangeValence = [0.5,0.5]
    rangeEnergy = [0.5,0.5]
    sortValue = 'valence'
  }
  searchTracks(rangeValence, rangeEnergy, sortValue)
    .then((songs) => {
      songs.forEach((song, index) => {
        console.log(`${index + 1}. ${song.song} - ${song.artist}`);
        console.log(`External URLs:`);
        Object.entries(song.externalUrls).forEach(([name, url]) => {
          console.log(`- ${name}: ${url}`);
        });
      });
    })
    .catch((error) => {
      console.error(error);
    });
}
