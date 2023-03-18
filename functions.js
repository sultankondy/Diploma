exports.getAllResults = getAllResults

async function getAllResults(url) {
  const response = await fetch(url);
  const data = await response.json();

  const results = data.results;

  if (data.next) {
    const nextPageResults = await getAllResults(data.next);
    results.push(...nextPageResults);
  }

  return results;
}

exports.binarySearchTitle = function(arr, title) {
  var left = 0;
  var right = arr.length - 1;
  while (left <= right) {
    var mid = Math.floor((left + right) / 2);
    if (arr[mid].title === title) {
      return arr[mid];
    }
    if (arr[mid].title < title) {
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }
  return null;
}

