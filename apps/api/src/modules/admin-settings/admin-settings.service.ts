import { Injectable, NotFoundException } from "@nestjs/common";
import {
  adminOperationEvents,
  moduleSettingGroups,
  operationSettingItems,
  systemSettingItems
} from "../../common/mock-data";

@Injectable()
export class AdminSettingsService {
  findOverview() {
    const allItems = [
      ...systemSettingItems,
      ...moduleSettingGroups.flatMap((group) => group.settings),
      ...operationSettingItems
    ];

    return {
      totalSettings: allItems.length,
      configured: allItems.filter((item) => item.status === "configured").length,
      needsReview: allItems.filter((item) => item.status === "needs_review").length,
      planned: allItems.filter((item) => item.status === "planned").length,
      systemSettings: systemSettingItems.length,
      moduleSettings: moduleSettingGroups.reduce((total, group) => total + group.settings.length, 0),
      operationSettings: operationSettingItems.length
    };
  }

  findAll() {
    return {
      overview: this.findOverview(),
      system: systemSettingItems,
      modules: moduleSettingGroups,
      operations: operationSettingItems,
      events: adminOperationEvents
    };
  }

  findSystemSettings() {
    return systemSettingItems;
  }

  findModuleSettings() {
    return moduleSettingGroups;
  }

  findOperationSettings() {
    return operationSettingItems;
  }

  findEvents() {
    return adminOperationEvents;
  }

  findOne(id: string) {
    const allItems = [
      ...systemSettingItems,
      ...moduleSettingGroups.flatMap((group) => group.settings),
      ...operationSettingItems
    ];
    const setting = allItems.find((item) => item.id === id);

    if (!setting) {
      throw new NotFoundException(`Admin setting ${id} was not found`);
    }

    return setting;
  }
}
