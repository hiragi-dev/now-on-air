// // var thumnails = document.getElementsByName("Thumbnail Image Button");



// if (document.readyState === 'complete') {
//     // すでにロードが完了している場合の処理
//     main();
// } else {
//     window.addEventListener('load', main);
// }

// const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// async function main() {

//     while (true) {
//         console.log(document)

//         const thumnails = document.querySelectorAll('button[name="Thumbnail Image Button"]');

//         console.log("hello" + thumnails + thumnails.length)
//         thumnails.forEach((el) => {
//             console.log(el);
//         });
//         await sleep(2000);
//     }
// }

var currentObserver = null
var acc = 0

window.navigation.addEventListener('currententrychange', (ev) => {

    console.log('navigated!')
    // if (ev.)

    const url = new URL(window.location.href)
    console.log(url.pathname)

    // ratedがつくのはおそらくその作品が人気ランキングに入っている場合
    if (url.pathname == "/vod/rated/detail/" || url.pathname == "/vod/detail/") {
        // API呼び出し等が完了し、DOMに確実に各話へのURLが存在するまで待機する

        console.log("detail-header: " + document.getElementById("#detail-header"))
        const mutationTarget = document.body;

        if (currentObserver != null) {
            console.log('disconnect: ' + currentObserver)
            currentObserver.disconnect()
        }

        const observer = new MutationObserver(records => {
            const thumnails = document.querySelectorAll('button[name="Thumbnail Image Button"]');
            if (thumnails.length != 0) {
                console.log('loaded: ' + acc + " :" + thumnails.length)
                // thumnails.forEach(e => console.log("contents: " + e))
                observer.disconnect()
            }

        })

        acc++

        observer.observe(mutationTarget, {
            childList: true,
            subtree: true,
        })

        currentObserver = observer
    }

})