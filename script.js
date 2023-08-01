"use strict";

(() => {
    const COINS_List_StorageKey = "Kola-Coins-List";
    const COINS_Selected_StorageKey = "Kola-Coins-Selected";
    const coinList_URL = "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1";
    const coinVal_URL = "https://api.coingecko.com/api/v3/coins/";
    const basicUrlToReports = "https://min-api.cryptocompare.com/data/pricemulti?fsyms=";
    const searchBox = document.getElementById("searchBox");

    let dataToReports_URL = "";
    let coinSpinnerBtn;
    let moreInfoContainer;
    let waitingToBeAdded = '';
    let coinsArr = [];
    let selectedArr = [];
    let getReportDataEveryTowSec;

    getHtml("currency");

    // =============================== Listeners ====================================
    document.addEventListener("click", handleGlobalClick);
    function handleGlobalClick(e) {
        const targetId = e.target.id;
        if (e.target.matches('.nav-link')) {
            getHtml(targetId);
        }
        if (e.target.matches('.navbar-brand')) {
            getHtml('currency');
        }
        if (e.target.matches('.switchBtn')) {
            handleCoinSelection(targetId);
        }
        if (e.target.matches('.coinInfoBtn')) {
            handleMoreInfo(targetId);
        }
    }

    searchBox.addEventListener("keyup", handleSearch);

    //  ============================ General Functions ================================
    function numberWithCommas(num) {
        let fixedNum = 1 * num.toFixed(3);
        fixedNum = fixedNum.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        return fixedNum;
    }

    async function getJson(url) {
        try {
            const response = await fetch(url);
            const json = await response.json();
            return json;
        } catch (err) {
            console.error(`Error To fetch json. (${err})`);
        }
    }

    function saveToSessionStorage(obj, key) {
        const data_str = JSON.stringify(obj);
        sessionStorage.setItem(key, data_str);
    }

    // =============================== Pages Navigation ===============================
    async function getHtml(page) {

        const htmlContainer = document.getElementById('container');
        const searchBox = document.getElementById('searchBox');
        const parallaxDiv = document.getElementById('parallaxDiv');

        const response = await fetch(`pages/${page}.html`);
        const html = await response.text();
        htmlContainer.innerHTML = html;
        clearInterval(getReportDataEveryTowSec);

        let navButtons = document.getElementsByClassName("nav-link");
        for (const btn of navButtons) {
            btn.id === page ? btn.classList.add("active") : btn.classList.remove("active");
        }
        searchBox.classList.add('visually-hidden');

        if (page === "about") {
            $('html, body').animate({ scrollTop: $("nav").offset().top }, 1000);
        };

        if (page === "reports") {
            $("html, body").animate({ scrollTop: $("nav").offset().top }, 1000);

            startReports()
        };
        if (page === "currency") {
            searchBox.classList.remove('visually-hidden');
            getFromSessionStorage();
        }
    }
    // =========== Get Coins + Create Arr and Storage ===========
    async function getAndDisplayCoinsList() {
        try {
            const coins = await getJson(coinList_URL);
            createCoinsArrayAndAddToStorage(coins);
        } catch (err) {
            console.error(`Can not display coins. (${err})`);
        }
    }

    function createCoinsArrayAndAddToStorage(coins) {
        for (const coin of coins) {
            let i = coinsArr.length;
            coinsArr.push({
                index: i,
                id: coin.id,
                symbol: coin.symbol,
                name: coin.name,
                image: coin.image,
                moreInfo: {
                    lastUpdate: 0,
                    currencyChange: 0,
                    usd: 0,
                    eur: 0,
                    ils: 0
                }
            })
        }
        displayCoins(coinsArr);
        saveToSessionStorage(coinsArr, COINS_List_StorageKey);
    }

    // ======== Get From Storage ========
    function getFromSessionStorage() {
        const coins_str = sessionStorage.getItem(COINS_List_StorageKey);
        const selected_str = sessionStorage.getItem(COINS_Selected_StorageKey);

        if (selected_str !== null) {
            selectedArr = JSON.parse(selected_str);
            writeSelectedCoins();
        };
        if (coins_str !== null) {
            coinsArr = JSON.parse(coins_str);
            displayCoins(coinsArr);
        } else {
            getAndDisplayCoinsList();
        }
    }

    // ======================================== Display Coins ===========================================
    function displayCoins(coinsToDisplay) {
        let html = '';
        if (coinsToDisplay.length > 0) {
            for (const coin of coinsToDisplay) {
                html += `
            <div class="col">
                <div class="card" id="${coin.id}_card">
                    <div  id="${coin.id}_switchBtn" class="switchBtn ${checkSwitchStatus(coin.id)}">
                        <div class="switcher"></div>
                    </div>
                    <img class="coinImg" src="${coin.image}" alt="${coin.name} icon">
                    <h3 style="display: inline">${coin.symbol}</h3>
                    <p>${coin.name}</p>
                    <button id="${coin.id}_infoBtn" class="btn btn-primary coinInfoBtn" 
                    data-bs-target="#${coin.id}_infoDiv">
                        <span class="visually-hidden spinner-border spinner-border-sm"></span>
                        <span>More info</span>
                    </button>
                    <div id="${coin.id}_infoDiv" class="coinInfoDiv collapse"></div>
                </div>
            </div>
            `
            }
        } else {
            html = `
            <div class="nothingToShow">
                <img class="coinImg" src="assets/icons/not-found.png" alt="Nothing To Show icon">    
                Nothing To Show...
            </div>
            `
        }
        const coinsContainer = document.getElementById("coinsContainer");
        coinsContainer.innerHTML += html;
    }

    function checkSwitchStatus(coin) {
        const result = getCoinObj(selectedArr, coin) ? "switchBtnOn" : "switchBtnOff";
        return result;
    }

    function handleSearch() {
        coinsContainer.innerHTML = "";
        const txt = searchBox.value;
        const result = coinsArr.filter(coin => coin.name.toLowerCase().includes(txt.toLowerCase()) || coin.symbol.toLowerCase().includes(txt.toLowerCase()));
        displayCoins(result);
    }

    // ======================================= More Info =============================================   
    async function handleMoreInfo(btnId) {
        try {
            let coinStr = btnId.split("_")[0];

            coinSpinnerBtn = document.querySelector(`#${coinStr}_infoBtn span`);
            moreInfoContainer = document.getElementById(`${coinStr}_infoDiv`);

            if (moreInfoContainer.classList.contains("show")) {
                $(moreInfoContainer).collapse('toggle');
                return;
            }

            const coinObj = getCoinObj(coinsArr, coinStr);

            if (coinObj.moreInfo.lastUpdate === 0 || coinObj.moreInfo.lastUpdate < (Date.now() / (1000 * 60)) - 2) {
                coinSpinnerBtn.classList.remove('visually-hidden');
                const coinMoreInfo = await getJson(`${coinVal_URL + coinStr}`);
                addMoreInfoToStorage(coinMoreInfo);
            } else {
                displayMoreInfo(coinObj);
            }
        } catch (err) {
            console.error(`Error to display more info. (${err})`);
        }
    }

    function getCoinObj(arr, coin) {
        const obj = arr.find(item => item.id === coin);
        return obj;
    }
    function getIndex(arr, coin) {
        const index = arr.findIndex(object => object.id === coin);
        return index;
    }

    function addMoreInfoToStorage(coinInfo) {
        coinSpinnerBtn.classList.add('visually-hidden');
        const currencyPriseChange = coinInfo.market_data.price_change_percentage_24h;
        const currentPrice = coinInfo.market_data.current_price;
        const index = getIndex(coinsArr, coinInfo.id);

        const moreInfoData = {
            lastUpdate: Math.round(Date.now() / (1000 * 60)),
            currencyChange: numberWithCommas(currencyPriseChange),
            usd: numberWithCommas(currentPrice.usd),
            eur: numberWithCommas(currentPrice.eur),
            ils: numberWithCommas(currentPrice.ils)
        }
        coinsArr[index].moreInfo = moreInfoData;
        saveToSessionStorage(coinsArr, COINS_List_StorageKey);

        displayMoreInfo(coinsArr[index]);
    }

    function displayMoreInfo(coinInfoObj) {
        const currentPrice = coinInfoObj.moreInfo;
        const currencyPriseChange = currentPrice.currencyChange;

        const upOrDown = currencyPriseChange > 0 ? "up" : "down";
        moreInfoContainer = document.getElementById(`${coinInfoObj.id}_infoDiv`);

        moreInfoContainer.innerHTML = `
            <div class="statusDiv ${upOrDown}Color">
                <img class="arrowImg" src="assets/icons/${upOrDown}.png" alt="Price Change ${upOrDown}" >
                ${currencyPriseChange} %
            </div>
            <table>
                <tr>
                    <td>USD - </td>
                    <td>${currentPrice.usd}</td>
                    <td>&#36;</td>
                </tr>
                <tr>
                    <td>EUR - </td>
                    <td>${currentPrice.eur}</td>
                    <td>&#8364;</td>
                </tr>
                <tr>
                    <td>ILS - </td>
                    <td>${currentPrice.ils}</td>
                    <td>&#8362;</td>
                </tr>
            </table>
        `;
        $(moreInfoContainer).collapse('toggle');
    }

    // ==================================== Select Coins ========================================
    function handleCoinSelection(btnId) {
        const coinStr = btnId.split("_")[0];
        const switchBtn = document.getElementById(`${coinStr}_switchBtn`);
        const coinIndex = getIndex(coinsArr, coinStr);

        if (switchBtn.classList.contains("switchBtnOff")) {
            if (selectedArr.length === 5) {
                waitingToBeAdded = coinStr;
                $('#myModal').modal('show');
                return;
            }
            switchBtn.classList.replace("switchBtnOff", "switchBtnOn");
            selectedArr.push(coinsArr[coinIndex]);
            writeSelectedCoins();
        } else {
            switchBtn.classList.replace("switchBtnOn", "switchBtnOff");
            const selectedCoinIndex = getIndex(selectedArr, coinStr);
            selectedArr.splice(selectedCoinIndex, 1);
            if (waitingToBeAdded !== '') {
                handleCoinSelection(waitingToBeAdded);
                $('#myModal').modal('hide');
                waitingToBeAdded = '';
            }
        }
        saveToSessionStorage(selectedArr, COINS_Selected_StorageKey);
    }

    function writeSelectedCoins() {
        const modalContainer = document.getElementById("modalContainer");
        let html = '';
        for (const coin of selectedArr) {
            html += `
            <div class="card selected-item" id="${coin.id}_item">
            <div  id="${coin.id}_removeBtn" class="switchBtn switchBtnOn">
                <div class="switcher"></div>
            </div>
            <img class="coinImg" src="${coin.image}" alt="${coin.name} icon">
            <span>${coin.symbol} - ${coin.name}</span>
            </div> `
        }
        modalContainer.innerHTML = html;
    }

    //============================================ Reports ===========================================
    let coinsDataToChart = [];

    function startReports() {
        const chartContainer = document.getElementById('chartContainer');
        coinsDataToChart = [];
        let coinsToFetch = '';

        if (selectedArr.length > 0) {
            for (const coin of selectedArr) {
                coinsToFetch += `${coin.symbol},`
            }
            coinsToFetch = coinsToFetch.slice(0, -1);
            dataToReports_URL = `${basicUrlToReports}${coinsToFetch}&tsyms=USD`;
            createCoinObjectToChart();
        } else {
            chartContainer.innerHTML = 'You must select at least one coin to track.'
        }
    }

    async function createCoinObjectToChart() {
        try {
            const coinsCurrentVal = await getJson(dataToReports_URL);

            for (const coin in coinsCurrentVal) {
                let coinName = coin;
                let currentTime = new Date();
                let coinVal = coinsCurrentVal[coinName]['USD'];

                if (coinsDataToChart.length < selectedArr.length) {
                    coinsDataToChart.push({
                        name: coinName,
                        type: "spline",
                        xValueFormatString: "HH:mm:ss",
                        yValueFormatString: "$#,##0.##",
                        showInLegend: true,
                        dataPoints: [{ x: currentTime, y: coinVal }]
                    })
                }
            }
            displayChart();
        } catch (err) {
            console.error(`Error to get data ${err}`);
        }
    }

    function displayChart() {
        let options = {
            animationEnabled: true,
            backgroundColor: '#ebebeb',
            title: {
                fontFamily: "'Exo', sans-serif",
                text: "KolaVC Reports",
            },
            axisX: { valueFormatString: "HH:mm:ss" },
            axisY: {
                title: "Value",
                valueFormatString: "$#,##0.##"
            },
            legend: {
                cursor: "pointer",
                fontSize: 16,
                itemclick: toggleDataSeries
            },
            toolTip: { shared: true },
            data: coinsDataToChart
        }

        let chart = new CanvasJS.Chart("chartContainer", options);
        chart.render();

        async function updateChart() {
            try {
                const coinsCurrentVal = await getJson(dataToReports_URL);

                for (const coin in coinsCurrentVal) {
                    let coinName = coin;
                    let currentTime = new Date();
                    let coinVal = coinsCurrentVal[coinName]['USD'];
                    let coinItem = options.data.find(item => item.name === coin);

                    coinItem.dataPoints.push({ x: currentTime, y: coinVal });
                }
                chart.render();
            } catch (err) {
                clearInterval(getReportDataEveryTowSec);
                console.error(`Error to get live data ${err}`);
            }
        }

        getReportDataEveryTowSec = setInterval(() => {
            updateChart();
        }, 2000);

        function toggleDataSeries(e) {
            if (typeof (e.dataSeries.visible) === "undefined" || e.dataSeries.visible) {
                e.dataSeries.visible = false;
            }
            else {
                e.dataSeries.visible = true;
            }
            chart.render();
        }
    }
})();