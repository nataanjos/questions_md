const frontmatter = require('@github-docs/frontmatter')
const { resolve } = require('path');
const { readdir, readFile } = require('fs').promises;
const admin = require("firebase-admin");

var serviceAccount = require("./questionsofcom.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore()

async function* getFiles(dir) {
  const dirents = await readdir(dir, { withFileTypes: true });
  for (const dirent of dirents) {
    const res = resolve(dir, dirent.name);
    if (dirent.isDirectory()) {
      yield* getFiles(res);
    } else {
      yield res;
    }
  }
}

async function parseQuestionMd(filepath){
    const md = (await readFile(filepath)).toString()
    const mdparsed = frontmatter(md)
    
    const meta = mdparsed.data
    const data = mdparsed.content
    
    const firstData = data.split(/-\s\[[\sx]\]\s.*/gi)
    
    const question = firstData[0].trim()
    const solution = firstData.length > 1? firstData[firstData.length - 1].trim(): ''
    
    let answer = -1
    const options = []
    const regexOptions = /-\s\[[\sx]\]\s(.*)/gi
    
    var m
    do {
        m = regexOptions.exec(data);
        if(m && m[0]){
            options.push(m[1].trim())
            const regexInternal = /-\s\[x\]\s/gi
            if(regexInternal.test(m[0]))
                answer = options.length - 1
        }
    } while (m)

    return {
        question,
        solution,
        options,
        answer,
        ...meta
    }
}

async function parseIndexMd(){
    const md = (await readFile('enem/index.md')).toString()
    const mdparsed = frontmatter(md)
    const meta = mdparsed.data
    const data = mdparsed.content
    return {
        ...meta,
        data
    }
}

(async () => {
    const notebookItem = await parseIndexMd()
    const notebookDoc = await db.collection("questionsof").add((({menu, ...rest})=>rest)(notebookItem))
    const menuDocsFirebase = notebookItem.menu.map(x => notebookDoc.collection("menu").add(x))
    await Promise.all(menuDocsFirebase)
    
    // console.log(teste)
    for await (const f of getFiles('./enem')) {
        const pathArray = f.split('/')
        const fileName = pathArray[pathArray.length - 1]
        if(fileName.split('.')[1] == "md" && fileName.split('.')[0] != "index"){
            await notebookDoc.collection("questions").add(await parseQuestionMd(f))
        }
    }
})()

