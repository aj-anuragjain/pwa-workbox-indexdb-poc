
importScripts('https://storage.googleapis.com/workbox-cdn/releases/3.5.0/workbox-sw.js')

if(workbox) {
    console.log('Yay! Workbox is loaded 🎉');
    workbox.precaching.precacheAndRoute([]);

    workbox.routing.registerRoute(
        /(.*)articles(.*)\.(?:png|gif|jpg)/,
        workbox.strategies.cacheFirst({
            cacheName: 'images-cache',
            plugins: [
                new workbox.expiration.Plugin({
                    maxEntries: 50,
                    maxAgeSeconds: 30 * 24 * 60 * 60 // 30 Days
                })
            ]
        })
    );

    workbox.routing.registerRoute(
        /(.*)images\/icon/,
        workbox.strategies.staleWhileRevalidate({
            cacheName: 'icon-cache',
            plugins: [
                new workbox.expiration.Plugin({
                    maxEntries: 5,
                    maxAgeSeconds: 30 * 24 * 60 * 60 // 30 Days
                })
            ]
        })
    );

    const articleHandler = workbox.strategies.networkFirst({
        cacheName: 'articles-cache',
        plugins: [
            new workbox.expiration.Plugin({
                maxEntries: 50,
            })
        ]
    });

    workbox.routing.registerRoute(
        /(.*)article(.*)\.html/, (args) => {
            return articleHandler.handle(args).then((response) => {
                if(!response){
                    return caches.match('pages/offline.html');
                } else if(response.status === 404) {
                    return caches.match('pages/404.html');
                }
                return response;
            });
        }
    );

    const postHandler = workbox.strategies.cacheFirst({
        cacheName: 'posts-cache',
        plugins: [
            new workbox.expiration.Plugin({
                maxEntries: 50,
            })
        ]
    });

    workbox.routing.registerRoute(
        /(.*)post(.*)\.html/, (args) => {
            return postHandler.handle(args).then((response) => {
                if(response.status === 404) {
                    return caches.match('pages/404.html');
                }
                return response;
            }).catch(() => {
                return caches.match('pages/offline.html');
            });
        }
    );

    const showNotifcation = () => {
        self.registration.showNotification('Background sync succcess!', {
            body: '🎉`🎉`🎉`'
        });
    }

    const bgSyncPlugin = new workbox.backgroundSync.Plugin(
        'dashboardr-queue',
        {
            callbacks: {
                // types of callbacks could go here
                queueDidReplay: showNotifcation
            }
        }
    );
    const networkWithBackgroundSync = new workbox.strategies.NetworkOnly({
        plugins: [bgSyncPlugin],
    });

    workbox.routing.registerRoute(
        /\/api\/add/,
        networkWithBackgroundSync,
        'POST'
    );
    workbox.routing.registerRoute(
        /\/api\/delete/,
        networkWithBackgroundSync,
        'POST'
    );
} else {
    console.log(`Boo! Workbox didn't load 😬`);
}



// Non-Workbox Scripts Goes Below

