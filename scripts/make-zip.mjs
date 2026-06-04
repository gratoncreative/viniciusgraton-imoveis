import AdmZip from 'adm-zip'
const zip = new AdmZip()
zip.addLocalFolder('dist')
zip.writeZip('viniciusgraton-site.zip')
console.log('zip criado')
