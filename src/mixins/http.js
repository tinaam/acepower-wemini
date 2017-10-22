import wepy from 'wepy'

export default class httpMixin extends wepy.mixin {
  $get(
    {url = '', headers = {}, data = {} }
  ) {
    const method = 'GET'
    return this.$ajax(
      {url, headers, method, data}
    )
  }

  $post(
    {url = '', headers = {}, data = {} }
  ) {
    const method = 'POST'
    return this.$ajax(
      {url, headers, method, data}
    )
  }

  $ajax(
    {url = '', headers = {}, method = 'GET', data = {} }
  ) {
    wepy.showNavigationBarLoading()
    // http header globally
    // set jwt header
    let httpHeaders = {}
    try {
      let token = wx.getStorageSync('jwt')
      if (token) {
        httpHeaders.Authorization = `Bearer ${token}`
      }
    } catch (e) {
      // ignore for the time being
    }
    const request = {
      url,
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
        this.$apply()
      })
  }
}
