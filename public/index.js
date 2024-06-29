let savedCoins = [];
let inrPrice = 83.52; // Default INR price, will be fetched from the server

const cryptoPricesContainer = document.getElementById("cryptoPrices");
const coinInput = document.getElementById("coinInput");
const quantityInput = document.getElementById("quantityInput");
const sortSelect = document.getElementById("sortSelect");
const searchInput = document.getElementById("searchInput");

// Fetch existing coins from the server
fetch("/api/coins")
  .then((response) => response.json())
  .then((data) => {
    console.log("Fetched coins:", data);
    savedCoins = data;
    data.forEach((coin) => {
      console.log("Processing coin:", coin);
      const savedCryptoElement = createCryptoElement(
        coin.id,
        coin.symbol,
        coin.quantity
      );
      cryptoPricesContainer.appendChild(savedCryptoElement);
    });
    updateTotal(); // Initial total value update
  })
  .catch((error) => {
    console.error("Error fetching coins:", error);
    // Handle error
  });

// WebSocket connection to update prices in real-time
const ws = new WebSocket("wss://stream.binance.com:9443/ws/!ticker@arr");

ws.onmessage = function (event) {
  const data = JSON.parse(event.data);
  updatePrices(data);
};

function updatePrices(priceData) {
  priceData.forEach((crypto) => {
    const symbol = crypto.s;
    const currentPrice = parseFloat(crypto.c).toFixed(6);

    if (savedCoins.some((coin) => coin.symbol.toUpperCase() === symbol.toUpperCase())) {
      const cryptoElement = document.getElementById(symbol.toLowerCase());
      if (cryptoElement) {
        const priceValueElement = cryptoElement.querySelector(".price-value");
        const quantityValueElement = cryptoElement.querySelector(".quantity-value");
        const totalValueElement = cryptoElement.querySelector(".total-value");
        const inrValueElement = cryptoElement.querySelector(".inr-value");

        const quantity = parseFloat(quantityValueElement.textContent);
        const totalPrice = (quantity * parseFloat(currentPrice)).toFixed(6);
        const inrValue = (totalPrice * inrPrice).toFixed(2);

        priceValueElement.textContent = `$${currentPrice}`;
        totalValueElement.textContent = `$${totalPrice}`;
        inrValueElement.textContent = `₹${inrValue}`;
      }
    }
  });
}

function calculateTotal() {
  let total = 0;
  savedCoins.forEach((coin) => {
    const priceElement = document.getElementById(coin.symbol.toLowerCase()).querySelector('.price-value');
    const quantityElement = document.getElementById(coin.symbol.toLowerCase()).querySelector('.quantity-value');
    const price = parseFloat(priceElement.textContent.substring(1));
    const quantity = parseFloat(quantityElement.textContent);
    const coinTotal = price * quantity;
    total += coinTotal;
  });
  return total.toFixed(6);
}

function updateTotal() {
  const totalValueContainer = document.getElementById('totalValue');
  const totalValue = calculateTotal();
  totalValueContainer.textContent = `$${totalValue} / ₹${(totalValue * inrPrice).toFixed(2)}`;
}

// Update total value initially
updateTotal();

// Set interval to update total value every 5 seconds
setInterval(updateTotal, 50);


function createCryptoElement(id, symbol, quantity) {
  console.log("Creating crypto element with ID:", id);
  const cryptoElement = document.createElement("div");
  cryptoElement.classList.add("price-detail");
  cryptoElement.id = symbol.toLowerCase();
  cryptoElement.setAttribute("data-id", id);
  cryptoElement.innerHTML = `
    <div class="price-label">${symbol}</div>
    <div class="quantity-value">${quantity}</div>
    <div class="price-value">$-</div>
    <div class="total-value">$-</div>
    <div class="inr-value">₹-</div> <!-- Added for INR value -->
  `;
  return cryptoElement;
}


function toggleTheme() {
  document.body.classList.toggle("dark-mode");
  const themeButton = document.querySelector(".dark-mode-btn i");
  if (document.body.classList.contains("dark-mode")) {
    themeButton.classList.remove("fa-moon");
    themeButton.classList.add("fa-sun");
  } else {
    themeButton.classList.remove("fa-sun");
    themeButton.classList.add("fa-moon");
  }
}

function sortAndFilter() {
  const sortValue = sortSelect.value;
  const searchTerm = searchInput.value.toLowerCase();
  const coins = Array.from(cryptoPricesContainer.children);

  coins.forEach((coin) => {
    const coinSymbol = coin.id;
    if (coinSymbol.includes(searchTerm)) {
      coin.style.display = "flex";
    } else {
      coin.style.display = "none";
    }
  });

  const visibleCoins = coins.filter((coin) => coin.style.display !== "none");
  if (sortValue === "alphabetical") {
    visibleCoins.sort((a, b) => a.id.localeCompare(b.id));
  } else if (sortValue === "alphabeticalDesc") {
    visibleCoins.sort((a, b) => b.id.localeCompare(a.id));
  } else if (sortValue === "priceAsc") {
    visibleCoins.sort((a, b) => {
      const priceA = parseFloat(
        a.querySelector(".price-value").textContent.substring(1)
      );
      const priceB = parseFloat(
        b.querySelector(".price-value").textContent.substring(1)
      );
      return priceA - priceB;
    });
  } else if (sortValue === "priceDesc") {
    visibleCoins.sort((a, b) => {
      const priceA = parseFloat(
        a.querySelector(".price-value").textContent.substring(1)
      );
      const priceB = parseFloat(
        b.querySelector(".price-value").textContent.substring(1)
      );
      return priceB - priceA;
    });
  }

  visibleCoins.forEach((coin) => cryptoPricesContainer.appendChild(coin));
}

// Add this to your existing JavaScript file

document.addEventListener('DOMContentLoaded', () => {
  fetchINRPrice();
});

function fetchINRPrice() {
  fetch('/api/inr')
      .then(response => response.json())
      .then(data => {
          const inrPriceDisplay = document.getElementById('inrPriceDisplay');
          inrPriceDisplay.textContent = `INR(₹) Price: ₹${data.inrPrice}`;
          inrPrice = data.inrPrice; // Update the INR price
          updatePrices(savedCoins); // Update prices using the new INR price
          updateTotal(); // Update total value using the new INR price
      })
      .catch(error => {
          console.error('Error fetching INR price:', error);
      });
}


// Function to reload the page every 5 minutes (300000 milliseconds)
setInterval(() => {
    window.location.reload();
  }, 300000);
