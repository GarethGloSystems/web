import {Plugin, markup, onWillDestroy, usePlugin} from "@odoo/owl";
import {ActionPlugin} from "@web/webclient/actions/action_plugin";
import {BusPlugin} from "@bus/services/bus_plugin";
import {NotificationPlugin} from "@web/core/notifications/notification_plugin";
import {_t} from "@web/core/l10n/translation";
import {services} from "@web/core/services";

// The core notification only accepts these types, anything else is rejected.
const CORE_TYPES = ["warning", "danger", "success", "info"];

export class WebNotifyPlugin extends Plugin {
    action = usePlugin(ActionPlugin);
    bus = usePlugin(BusPlugin);
    notification = usePlugin(NotificationPlugin);

    setup() {
        const unsubscribe = this.bus.subscribe("web_notify", (payload) => {
            this.displayWebNotification(payload);
        });
        this.bus.start();
        onWillDestroy(unsubscribe);
    }

    displayWebNotification(notification) {
        let buttons = [];
        if (notification.action) {
            const params = notification.action.context?.params || {};
            // Icons are Material Symbols names (e.g. "visibility") since
            // Font Awesome is gone: skip "fa-*" names rather than show a blank glyph
            const icon = params.button_icon?.startsWith("fa-")
                ? null
                : params.button_icon;

            buttons = [
                {
                    name: params.button_name || _t("Open"),
                    onClick: async () => {
                        await this.action.doAction(notification.action);
                    },
                    ...(icon && {icon}),
                },
            ];
        }

        // "default" is not a core type: show it as a neutral notification
        const isDefault = !CORE_TYPES.includes(notification.type);
        const className = [notification.className, isDefault && "o_web_notify_default"]
            .filter(Boolean)
            .join(" ");

        const notificationRemove = this.notification.add(
            notification.html ? markup(notification.message) : notification.message,
            {
                title: notification.title,
                type: isDefault ? "info" : notification.type,
                sticky: notification.sticky,
                className,
                buttons: buttons.map((button) => {
                    const onClick = button.onClick;
                    button.onClick = async () => {
                        await onClick();
                        notificationRemove();
                    };
                    return button;
                }),
            }
        );
    }
}

services.add(WebNotifyPlugin);
