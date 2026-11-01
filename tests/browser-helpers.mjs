export async function closeDevelopmentNotice(page){
  await page.getByRole('button',{name:'关闭温馨提示',exact:true}).click();
}
