let excludeEntries = [
    // 'pageOne'
];

module.exports = excludeEntries.map(element => {
    return `${element}/index`
});;