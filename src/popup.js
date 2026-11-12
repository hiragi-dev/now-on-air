// setTimeout(() => {
//     alert("Hello, world! (from js)");
// }, 700);

// 検索ボタンクリック時
document.querySelector("#searchButton").addEventListener("click", () => {
    // 検索ワードの取得
    // const searchWord = document.querySelector("#searchWord").value;

    // // 対象のタブを特定して、コンテンツに送信
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, 'hello', (responseFromContent) => {

            // コンテンツから受け取ったレスポンスをダイアログ表示
            // alert(responseFromContent);
            // // ポップアップを閉じる(コンテンツではない)
            // window.close();
        });
    });
    // alert('clicked')
});
