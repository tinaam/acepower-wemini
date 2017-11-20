import wepy from 'wepy'
import config from '../config'

function httpAjax (
  {url = '', headers = {}, method='', data = {}, baseUrl=config.baseUrl}
) {
  wepy.showNavigationBarLoading()
  // http header globally
  // set jwt header
  let httpHeaders = {}
  try {
    let token = wepy.getStorageSync('jwt')
    if (token) {
      httpHeaders.Authorization = `Bearer ${token}`
    }
  } catch (e) {
    // ignore for the time being
  }
  
  const request = {
    url: `${baseUrl}${url}`,
    method: ['GET', 'POST'].indexOf(method) > -1 ? method : 'GET',
    header: Object.assign(httpHeaders, headers),
    data: Object.assign({
      // set something global
    }, data)
  }

  // show console log
  console.table(request)

  return wepy.request(request)
    .then(({statusCode, data}) => {
      if (statusCode<200 || statusCode>300) {
        // I think wx is not that smart..., 400 is consider to go here
        throw {statusCode, data}
      }
      console.info('[SUCCESS]', statusCode, typeof data === 'object'? data: data.toString().substring(0, 100))
      return {statusCode, data}
    })
    .catch((error) => {
      console.error('[FAIL]', error)
      // maybe 403 we so a msg before refresh the page 
      throw error
    })
    .finally((res) => {
      console.log('[COMPLETE]', res)
      wepy.hideNavigationBarLoading()
      wepy.stopPullDownRefresh()
      if (this && this.$apply){
        console.info('with this')
        this.$apply()
      }
    })
}

function httpGet (
  {url = '', headers = {}, data = {}, baseUrl=config.baseUrl}
){
  const method = 'GET'
  return httpAjax.call(this,
    {url, headers, method, data, baseUrl}
  )
}

function httpPost (
  {url = '', headers = {}, data = {}, baseUrl=config.baseUrl}
){
  const method = 'POST'
  return httpAjax.call(this,
    {url, headers, method, data, baseUrl}
  )
}

class httpMixin extends wepy.mixin {
  $get (params) {
    return httpGet.call(this, params)
  }
  $post (params) {
    return httpPost.call(this, params)
  }
  $ajax (params) {
    return httpAjax.call(this, params)
  } 
}

export {
  httpMixin as default,
  httpGet,
  httpPost,
  httpAjax
}