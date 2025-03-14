import { PageViewManager } from '../page-view'
import { PostHog } from '../posthog-core'

const mockWindowGetter = jest.fn()
jest.mock('../utils/globals', () => ({
    ...jest.requireActual('../utils/globals'),
    get window() {
        return mockWindowGetter()
    },
}))

describe('PageView ID manager', () => {
    describe('doPageView', () => {
        const instance: PostHog = {
            config: {},
        } as any
        beforeEach(() => {
            mockWindowGetter.mockReturnValue({
                location: {
                    pathname: '/pathname',
                },
                scrollY: 0,
                document: {
                    documentElement: {
                        clientHeight: 0,
                        scrollHeight: 0,
                    },
                },
            })
        })

        it('includes scroll position properties for a partially scrolled long page', () => {
            // note that this means that the user has scrolled 2/3rds of the way down the scrollable area, and seen
            // 3/4 of the content
            mockWindowGetter.mockReturnValue({
                location: {
                    pathname: '/pathname',
                },
                scrollY: 2000, // how far down the user has scrolled
                document: {
                    documentElement: {
                        clientHeight: 1000, // how tall the window is
                        scrollHeight: 4000, // how tall the page content is
                    },
                },
            })

            const pageViewIdManager = new PageViewManager(instance)
            pageViewIdManager.doPageView()

            // force the manager to update the scroll data by calling an internal method
            pageViewIdManager._updateScrollData()

            const secondPageView = pageViewIdManager.doPageView()
            expect(secondPageView.$prev_pageview_last_scroll).toEqual(2000)
            expect(secondPageView.$prev_pageview_last_scroll_percentage).toBeCloseTo(2 / 3)
            expect(secondPageView.$prev_pageview_max_scroll).toEqual(2000)
            expect(secondPageView.$prev_pageview_max_scroll_percentage).toBeCloseTo(2 / 3)
            expect(secondPageView.$prev_pageview_last_content).toEqual(3000)
            expect(secondPageView.$prev_pageview_last_content_percentage).toBeCloseTo(3 / 4)
            expect(secondPageView.$prev_pageview_max_content).toEqual(3000)
            expect(secondPageView.$prev_pageview_max_content_percentage).toBeCloseTo(3 / 4)
        })

        it('includes scroll position properties for a short page', () => {
            mockWindowGetter.mockReturnValue({
                location: {
                    pathname: '/pathname',
                },
                scrollY: 0,
                document: {
                    documentElement: {
                        clientHeight: 1000, // how tall the window is
                        scrollHeight: 500, // how tall the page content is
                    },
                },
            })

            const pageViewIdManager = new PageViewManager(instance)
            pageViewIdManager.doPageView()

            // force the manager to update the scroll data by calling an internal method
            pageViewIdManager._updateScrollData()

            const secondPageView = pageViewIdManager.doPageView()
            expect(secondPageView.$prev_pageview_last_scroll).toEqual(0)
            expect(secondPageView.$prev_pageview_last_scroll_percentage).toEqual(1)
            expect(secondPageView.$prev_pageview_max_scroll).toEqual(0)
            expect(secondPageView.$prev_pageview_max_scroll_percentage).toEqual(1)
            expect(secondPageView.$prev_pageview_last_content).toEqual(1000)
            expect(secondPageView.$prev_pageview_last_content_percentage).toEqual(1)
            expect(secondPageView.$prev_pageview_max_content).toEqual(1000)
            expect(secondPageView.$prev_pageview_max_content_percentage).toEqual(1)
        })

        it('can handle scroll updates before doPageView is called', () => {
            const pageViewIdManager = new PageViewManager(instance)

            pageViewIdManager._updateScrollData()
            const firstPageView = pageViewIdManager.doPageView()
            expect(firstPageView.$prev_pageview_last_scroll).toBeUndefined()

            const secondPageView = pageViewIdManager.doPageView()
            expect(secondPageView.$prev_pageview_last_scroll).toBeDefined()
        })

        it('should include the pathname', () => {
            const pageViewIdManager = new PageViewManager(instance)

            const firstPageView = pageViewIdManager.doPageView()
            expect(firstPageView.$prev_pageview_pathname).toBeUndefined()
            const secondPageView = pageViewIdManager.doPageView()
            expect(secondPageView.$prev_pageview_pathname).toEqual('/pathname')
        })
    })
})
