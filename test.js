/**
 * 根据 searchValue 字符串模糊查找 str 中的内容，并将其替换为 replaceValue。
 * @param {string} str 
 * @param {string} searchValue 
 * @param {string} replaceValue 
 */
function fuzzyReplace(str, searchValue, replaceValue="") {
    let searchIndex = 0;
    searchValue = searchValue.replace(/\s/g, '');
    for (let i = 0; i < str.length; i++) {
        if (str[i] === searchValue[searchIndex]) {
            searchIndex++;
            if (searchIndex === searchValue.length) {
                return replaceValue + str.substring(i + 1);
            }
        } else {
            continue;
        }
    }
    return str;
}

a = " [ 2 3 4 1 5 2 1 6 ] × [ 2 3 3 4 1 2 2 4 5 1 5 3 ] = [ 25 30 35 24 51 42 ] \\left[\\begin{matrix}2 & 3 & 4 & 1 \\\\ 5 & 2 & 1& 6 \\end{matrix}\\right] \\times \\left[\\begin{matrix}2 & 3 & 3\\\\ 4 & 1 & 2\\\\ 2 & 4 & 5\\\\ 1 & 5 & 3\\\\ \\end{matrix}\\right] = \\left[\\begin{matrix}25 & 30 & 35\\\\ 24 & 51 & 42 \\end{matrix}\\right] "
b = "[25324116]× 242131453253 =[252430513542]" 
console.log(fuzzyReplace(a, b, '') )