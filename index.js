// 引用套件
import linebot from 'linebot'
import dotenv from 'dotenv'
import axios from 'axios'
import cheerio from 'cheerio'
// import js from 'js'

// 讀套件讀取 .env 檔案
// 讀取後可以用 process.env.變數 使用
dotenv.config()

const bot = linebot({
  channelId: process.env.CHANNEL_ID,
  channelSecret: process.env.CHANNEL_SECRET,
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN
})

// 監聽進來 3000 的請求 後方可以接 function
bot.listen('/', process.env.PORT, () => {
  console.log('機器人啟動')
})

// 機器人要做的事情
bot.on('message', async event => {
  // 若你傳的東西類型是文字
  if (event.message.type === 'text') {
    let msg = event.message.text
    // 若你傳送的字是 !help-----------------------------------------------------------------------------
    if (msg === '!help') {
      const help =
        '歡迎使用動畫瘋查詢機器人\n機器人指令=>\n☆!help:顯示幫助訊息\n☆!anime:空格後接關鍵字 搜尋\n例如:!anime 巨人\n☆!today:可以顯示今日更新的動畫\n\n動畫瘋自2021年1月1日起\n停止支援手機網頁撥放\n請下載動畫瘋 app 使用喔!\n一次搜尋的結果最多 12 筆\n請搜尋關鍵字時多加留意'
      event.reply(help)

      // 若你傳送的字是 !anime 關鍵字--------------------------------------------------------------------------
      // msg.substring(0, 7) msg 前七個字是 !anime 會產生一個新字串 此時的 msg 會變成 !anime
    } else if (msg.substring(0, 7) === '!anime ') {
      // 判斷完 msg 後要把 !anime 替換成空的字(刪掉) 不然底下的網址會多 !anime
      msg = msg.replace('!anime ', '')
      try {
        // 第一層 抓搜尋結果的網站
        const response = await axios.get(`https://ani.gamer.com.tw/search.php?kw=${encodeURI(msg)}`)
        let $ = cheerio.load(response.data)

        // 第二層 搜尋結果裡各別的網址陣列 用陣列存著的話就可以把 function 裡的資料帶出外面
        const links = []

        // 用陣列存取 function 裡的資料就可以帶到外面
        const arrHttp = []
        const arrImg = []
        const arrName = []
        const arrDate = []
        let arrType = []
        let arrCom = []
        let arrScore = []

        // 第一層---------------------------------------------------------------------------------------------------------
        // 搜尋結果的網站的資料 .old_list 裡面的 .theme-list-block 裡面的 a 標籤 全部
        $('.old_list .theme-list-block a').each(function () {
          // 搜尋結果的每個動畫網址 抓全部 a 標籤裡圖片的 href 屬性
          // console.log('https://ani.gamer.com.tw/' + $(this).attr('href'))
          arrHttp.push('https://ani.gamer.com.tw/' + $(this).attr('href'))

          // 搜尋結果的每個動畫圖片 抓全部 a 標籤裡圖片的 src 屬性
          // console.log($(this).find('.theme-img').attr('src'))
          arrImg.push($(this).find('.theme-img').attr('src'))
          // 搜尋結果的每個動畫名稱 抓全部 a 標籤裡的名稱
          // console.log($(this).find('.theme-name').text())
          arrName.push($(this).find('.theme-name').text())

          // 搜尋結果的每個動畫日期 抓全部 a 標籤裡的日期
          // console.log($(this).find('.theme-time').text()
          // substring( , ) 只取第幾個到第幾個字
          arrDate.push($(this).find('.theme-time').text().substring(3, 100))

          // 抓第一層搜尋結果的每個動畫網址 塞進 links 的空陣列
          links.push('https://ani.gamer.com.tw/' + $(this).attr('href'))
        })

        //   each() 裡 async await 無效 第一層資料還沒出來就會跑第二層了
        //   因為 each() 裡 async await 無效 所以用 for 迴圈先把所有網址先跑出來在抓資料
        for (const link of links) {
          //  用迴圈跑第一層搜尋結果的每個動畫網址 再去抓資料
          const response = await axios.get(link)
          $ = cheerio.load(response.data)

          // 第二層---------------------------------------------------------------------------------------------
          // 搜尋結果的每個動畫資料 .container-player裡的全部
          $('.container-player').each(function () {
            // 作品類型
            // console.log($(this).find('.data_type li').eq(0).text())
            // substring( , ) 只取第幾個到第幾個字
            arrType.push($(this).find('.data_type li').eq(0).text().substring(4, 100))

            // 製作廠商
            // console.log($(this).find('.data_type li').eq(4).text())
            // substring( , ) 只取第幾個到第幾個字
            arrCom.push($(this).find('.data_type li').eq(4).text().substring(4, 100))

            // 動畫評分
            // console.log($(this).find('.data_acgbox'))
            // 因為 span 包在 div 裡面 用選擇器抓不到 所以先 remove div 的下一層 span 在抓 div
            $('.ACG-score').children().remove()
            arrScore.push($(this).find('.ACG-score').text())
          })
        }
        // 作品類型 消除陣列裡的空白值
        // 找陣列中有值的才 retrun 出來
        arrType = arrType.filter(function (a) {
          return a.length > 0
        })

        // 製作廠商 消除陣列裡的空白值
        arrCom = arrCom.filter(function (a) {
          return a.length > 0
        })

        // 動畫評分 消除陣列裡的空白值
        arrScore = arrScore.filter(function (a) {
          return a.length > 0
        })

        // 使用 line flex message 的模板
        const flex = {
          type: 'flex',
          altText: `您搜尋:${msg} 的結果`,
          contents: {
            type: 'carousel',
            contents: []
          }
        }

        // 跑迴圈將搜尋結果的每個動畫資料陣列 push 進 flex message 的 contents 裡面
        for (let i = 0; i < arrName.length; i++) {
          flex.contents.contents.push({
            // 動畫圖片
            type: 'bubble',
            size: 'micro',
            hero: {
              type: 'image',
              url: `${arrImg[i]}`,
              size: 'full',
              aspectMode: 'cover',
              aspectRatio: '1:1',
              // 點擊圖片跳到該動畫瘋網址
              action: {
                type: 'uri',
                uri: `${arrHttp[i]}`
              }
            },

            // 動畫名稱
            body: {
              type: 'box',
              layout: 'vertical',
              contents: [
                {
                  type: 'text',
                  text: `${arrName[i]}`,
                  weight: 'bold',
                  size: '14px',
                  wrap: true
                },

                // 動畫評分
                {
                  type: 'box',
                  layout: 'vertical',
                  spacing: 'sm',
                  margin: 'sm',
                  contents: [
                    {
                      type: 'box',
                      layout: 'baseline',
                      contents: [
                        {
                          type: 'icon',
                          url: 'https://icons555.com/images/icons-red/image_icon_rating_pic_512x512.png',
                          size: '15px'
                        },
                        {
                          type: 'text',
                          text: `${arrScore[i]}`,
                          size: '14px',
                          weight: 'bold',
                          margin: 'sm',
                          offsetTop: '-2.5px',
                          flex: 0
                        }
                      ]
                    }
                  ]
                },

                // 作品年份
                {
                  type: 'box',
                  layout: 'vertical',
                  margin: 'sm',
                  spacing: 'sm',
                  contents: [
                    {
                      type: 'box',
                      layout: 'baseline',
                      spacing: 'sm',
                      contents: [
                        {
                          type: 'text',
                          text: '上映時間',
                          color: '#aaaaaa',
                          size: '13px',
                          flex: 0
                        },
                        {
                          type: 'text',
                          text: `${arrDate[i]}`,
                          wrap: true,
                          size: '12px',
                          offsetStart: '5px'
                        }
                      ]
                    },

                    // 作品類型
                    {
                      type: 'box',
                      layout: 'baseline',
                      spacing: 'sm',
                      contents: [
                        {
                          type: 'text',
                          text: '作品類型',
                          color: '#aaaaaa',
                          size: '13px',
                          flex: 0
                        },
                        {
                          type: 'text',
                          text: `${arrType[i]}`,
                          wrap: true,
                          size: '12px',
                          offsetStart: '5px'
                        }
                      ]
                    },

                    // 製作廠商
                    {
                      type: 'box',
                      layout: 'baseline',
                      spacing: 'sm',
                      contents: [
                        {
                          type: 'text',
                          text: '製作廠商',
                          color: '#aaaaaa',
                          size: '13px',
                          flex: 0
                        },
                        {
                          type: 'text',
                          text: `${arrCom[i]}`,
                          wrap: true,
                          size: '12px',
                          offsetStart: '5px'
                        }
                      ]
                    }
                  ]
                }
              ],
              spacing: 'sm',
              paddingAll: '10px'
            }
          })
        }
        if (arrName.length === 0) {
          event.reply('查不到此關鍵字的資料\n請重新確認')
        }
        // 若查出來有東西 linebot 回傳 flex
        event.reply(flex)
        // 發生錯誤要回傳的東西
      } catch (error) {
        event.reply('發生錯誤')
      }
      // 若你搜尋的是 !today-----------------------------------------------------------------------------
      // 抓本季新番 今天更新的動畫
    } else if (msg === '!today') {
      try {
        const response1 = await axios.get('https://ani.gamer.com.tw/')
        let $1 = cheerio.load(response1.data)
        const links1 = []
        const arr1Http = []
        const arr1Img = []
        const arr1Name = []
        const arr1Ep = []
        const arr1Date = []
        const arr1Type = []
        const arr1Com = []
        const arr1Score = []
        $1('.newanime-block .new-count-1 .anime-block a').each(function () {
          // 動畫網址
          $1(this).attr('href')
          // console.log('https://ani.gamer.com.tw/' + $1(this).attr('href'))
          arr1Http.push('https://ani.gamer.com.tw/' + $1(this).attr('href'))
          // 動畫圖片
          $1(this).find('.lazyload').attr('src')
          // console.log($1(this).find('.lazyload').attr('src'))
          arr1Img.push($1(this).find('.lazyload').attr('src'))
          // 動畫名稱
          $1(this).find('.anime-name p').eq(0).text()
          // console.log($1(this).find('.anime-name p').eq(0).text())
          arr1Name.push($1(this).find('.anime-name p').eq(0).text())
          // 動畫目前集數
          $1(this).find('.anime-episode p').text()
          console.log($1(this).find('.anime-episode p').text())
          arr1Ep.push($1(this).find('.anime-episode p').text())

          links1.push('https://ani.gamer.com.tw/' + $1(this).attr('href'))
        })
        for (const link1 of links1) {
          const response1 = await axios.get(link1)
          $1 = cheerio.load(response1.data)
          $1('.container-player').each(function () {
            // 上架時間
            $1('.anime_info_detail').find('p').text().substring(5, 100)

            // 作品類型
            $1('.data_type li').eq(0).text().substring(4, 100)

            // 製作廠商
            $1('.data_type li').eq(4).text().substring(4, 100)

            // 評分
            $1('.ACG-score').children().remove()
            $1('.ACG-score').text()
          })
          arr1Date.push($1('.anime_info_detail').find('p').text().substring(5, 100))
          arr1Type.push($1('.data_type li').eq(0).text().substring(4, 100))
          arr1Com.push($1('.data_type li').eq(4).text().substring(4, 100))
          arr1Score.push($1('.ACG-score').text())
        }
        // 使用 line flex message 的模板
        const flex1 = {
          type: 'flex',
          altText: `您搜尋:${msg} 的結果`,
          contents: {
            type: 'carousel',
            contents: []
          }
        }

        // 跑迴圈將搜尋結果的每個動畫資料陣列 push 進 flex1 message 的 contents 裡面
        for (let i = 0; i < arr1Name.length; i++) {
          flex1.contents.contents.push({
            // 動畫圖片
            type: 'bubble',
            size: 'micro',
            hero: {
              type: 'image',
              url: `${arr1Img[i]}`,
              size: 'full',
              aspectMode: 'cover',
              aspectRatio: '1:1',
              // 點擊圖片跳到該動畫瘋網址
              action: {
                type: 'uri',
                uri: `${arr1Http[i]}`
              }
            },

            // 動畫名稱
            body: {
              type: 'box',
              layout: 'vertical',
              contents: [
                {
                  type: 'text',
                  text: `${arr1Name[i]}`,
                  weight: 'bold',
                  size: '14px',
                  wrap: true
                },

                // 動畫評分
                {
                  type: 'box',
                  layout: 'vertical',
                  spacing: 'sm',
                  margin: 'sm',
                  contents: [
                    {
                      type: 'box',
                      layout: 'baseline',
                      contents: [
                        {
                          type: 'icon',
                          url: 'https://icons555.com/images/icons-red/image_icon_rating_pic_512x512.png',
                          size: '15px'
                        },
                        {
                          type: 'text',
                          text: `${arr1Score[i]}`,
                          size: '14px',
                          weight: 'bold',
                          margin: 'sm',
                          offsetTop: '-2.5px',
                          flex: 0
                        }
                      ]
                    }
                  ]
                },

                // 作品年份
                {
                  type: 'box',
                  layout: 'vertical',
                  margin: 'sm',
                  spacing: 'sm',
                  contents: [
                    {
                      type: 'box',
                      layout: 'baseline',
                      spacing: 'sm',
                      contents: [
                        {
                          type: 'text',
                          text: '上映時間',
                          color: '#aaaaaa',
                          size: '13px',
                          flex: 0
                        },
                        {
                          type: 'text',
                          text: `${arr1Date[i]}`,
                          wrap: true,
                          size: '12px',
                          offsetStart: '5px'
                        }
                      ]
                    },

                    // 作品類型
                    {
                      type: 'box',
                      layout: 'baseline',
                      spacing: 'sm',
                      contents: [
                        {
                          type: 'text',
                          text: '作品類型',
                          color: '#aaaaaa',
                          size: '13px',
                          flex: 0
                        },
                        {
                          type: 'text',
                          text: `${arr1Type[i]}`,
                          wrap: true,
                          size: '12px',
                          offsetStart: '5px'
                        }
                      ]
                    },

                    // 製作廠商
                    {
                      type: 'box',
                      layout: 'baseline',
                      spacing: 'sm',
                      contents: [
                        {
                          type: 'text',
                          text: '製作廠商',
                          color: '#aaaaaa',
                          size: '13px',
                          flex: 0
                        },
                        {
                          type: 'text',
                          text: `${arr1Com[i]}`,
                          wrap: true,
                          size: '12px',
                          offsetStart: '5px'
                        }
                      ]
                    },
                    // 最新集數
                    {
                      type: 'box',
                      layout: 'baseline',
                      spacing: 'sm',
                      contents: [
                        {
                          type: 'text',
                          text: '最新集數',
                          color: '#aaaaaa',
                          size: '13px',
                          flex: 0
                        },
                        {
                          type: 'text',
                          text: `${arr1Ep[i]}`,
                          wrap: true,
                          size: '12px',
                          offsetStart: '5px'
                        }
                      ]
                    }
                  ]
                }
              ],
              spacing: 'sm',
              paddingAll: '10px'
            }
          })
        }
        if (arr1Name.length === 0) {
          event.reply('查不到此關鍵字的資料\n請重新確認')
        }
        event.reply(flex1)
      } catch (error) {
        event.reply('發生錯誤')
      }
    }
  }
})
