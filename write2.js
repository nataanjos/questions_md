const { resolve } = require('path');
const { readdir, readFile, writeFile } = require('fs').promises;
const frontmatter = require('@github-docs/frontmatter')
const yaml = require('js-yaml');






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

(async () => {
    const navData = (await readFile('enem/nav.yaml')).toString()

    const nav = yaml.safeLoad(navData)

    for await (const f of getFiles('./enem')) {
        const pathArray = f.split('/')
        const fileName = pathArray[pathArray.length - 1]
        const fileNameWithFolder = `${pathArray[pathArray.length - 2]}/${fileName}`
        if(fileName.split('.')[1] == "md" && fileName.split('.')[0] != "index"){
            const data = (await readFile(f)).toString()
            const questionMeta = nav.questions.filter(x => x.file == fileNameWithFolder).map(x => ({
                title: x.title.slice(0, 60),
                url: x.url.slice(0, 60),
                topic: x.topic
            }))[0]
            //console.log(questionMeta)
            const dataWithFrontMatter = frontmatter.stringify(data, questionMeta)
            
            await writeFile(f, dataWithFrontMatter)
            console.log(f)
        }
    }
})()

// const files = fs.readdirSync('enem').filter(x => x.split('.')[1] == "md" && x.split('.')[0] != "index")
// const yaml = require('js-yaml');
// const frontmatter = require('@github-docs/frontmatter')

// console.log(files)

//const nav = yaml.safeLoad(data)
//console.log(files)
// for(let i in files){
//     const file = files[i]
//     const data2 = fs.readFileSync(`enem/${file}`, {encoding: 'utf8'}).toString()
//     const { data, content, errors } = frontmatter(data2)
//     console.log(i)
//     fs.renameSync(`enem/${file}`, `enem/a${i}.md`)
//     // console.log(title, topic)
// }
