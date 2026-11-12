// ポップアップからのメッセージを受け取るためのリスナー登録
chrome.runtime.onMessage.addListener((searchWord, _ev, sendResponse) => {
    // 検索ワードをセットして検索
    //   document.querySelector("input[autofocus]").value = searchWord;
    //   document.querySelector('input[type="submit"]').click();

    //   // ポップアップにメッセージを返す
    //   sendResponse(`search: ${searchWord}`);
    console.log('message requested!')
    alert('message requested!')
});
