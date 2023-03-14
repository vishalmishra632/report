import React, { useContext, useLayoutEffect, useState } from "react";
import { Modal, Space, Input, Form, Button } from "antd";
import { CloseCircleOutlined, FileOutlined } from "@ant-design/icons";
import "simplebar/dist/simplebar.min.css";
import CommonService from "../../../Services/common.service";
import { nullDataCheck } from "../../../Shared/Common";
import ENUM_HTTPSTATUSCODE from "../../../Common/utility/httpstatuscode.enum";
import { AuthContext } from "../../../AppState";
import { FUNCTIONALITY } from "../../../Common/utility/globalenums";

function CustomReport(props) {
  let {
    saveCustomReport,
    sorting,
    notificationTitle,
    layout,
    parentReportID,
    setLayout,
    pageTitle,
    pagination,
    visibleDownload,
    location,
  } = props;
  let [isSaveCustom, setIsSaveCustom] = useState(false);
  let [isLoading, setIsLoading] = useState(false);
  const [form] = Form.useForm();
  const [commonService] = useState(() => new CommonService());
  const { getCurrentUser } = useContext(AuthContext);
  const currentuser = getCurrentUser();
  const handleOk = () => {
    form.submit();
  };


  const onFinish = () => {
    setIsLoading(true);
    saveCustomReport(
      sorting,
      form.getFieldValue("reportName"),
      parentReportID,
      notificationTitle,
      layout.layoutID,
      layout.reportMasterID,
      setIsSaveCustom,
      setIsLoading,
      setLayout,
      form,
      pagination,
      // Callback function to clear filter state
      () => {
        const filterValues = form.getFieldsValue(['memberId']);
        if (filterValues.memberId) {
          filterValues.memberId = '';
          form.setFieldsValue(filterValues);
        }
      }
    );
  };
  
  useLayoutEffect(() => {
    if (
      window.location.search !== "" &&
      window.location.search.substring(0, 1) === "?"
    ) {
      commonService
        .getCustomReportData(window.location.search.substring(1))
        .then((response) => {
          if (nullDataCheck(response, notificationTitle)) return;
          if (response.statusCode === ENUM_HTTPSTATUSCODE.OK) {
            const layout = JSON.parse(response.data.Layout);
            if (response.data.LayoutID > 0)
              updateVisitedCustomReportName(
                response.data.LayoutName,
                location.pathname,
                location.search
              );
            setLayout({
              layoutID: response.data.LayoutID,
              layoutName: response.data.LayoutName,
              layout: layout,
              reportMasterID: response.data.ReportMasterID,
            });
            form.setFieldsValue({ reportName: response.data.LayoutName });
          }
        });
    } else {
      setLayout({ layoutID: 0, layoutName: pageTitle });
      form.setFieldsValue({ reportName: "" });
    }
  }, []);

  const updateVisitedCustomReportName = (title, pathname, search) => {
    let params = {
      pageURL: (pathname + search).slice(1),
      pageTitle: title,
    };
    commonService.updateVisitedCustomReportName(params).then((res) => {
      if (nullDataCheck(res, notificationTitle)) return;
      if (res.statusCode === ENUM_HTTPSTATUSCODE.OK) {
        console.log(ENUM_HTTPSTATUSCODE.OK);
      }
    });
  };

  const handleKeyPress = (e) => {
    if (e.target.value === "" && e.code === "Space") e.preventDefault();
    if (e.charCode === 60 || e.charCode === 62) e.preventDefault();
  };

  const handleChange = (e) => {
    form.setFieldsValue({
      reportName: e.target.value.trim() === "" ? "" : e.target.value,
    });
  };

  const handlePaste = (e) => {
    let value = e.clipboardData.getData("Text");
    let lengthVal = value.length;
    let currVal = e.target.value;
    value =
      currVal.slice(0, e.target.selectionStart) +
      value +
      currVal.slice(e.target.selectionStart);
    if (value.trim() === "") {
      e.preventDefault();
      e.target.value = "";
    } else {
      let temp = e.target.selectionStart + lengthVal;
      setTimeout(() => {
        e.target.selectionEnd = temp;
      }, 5);
    }
  };

  const handleBlur = (e) => {
    form.setFieldsValue({ reportName: e.target.value.trim() });
  };
  return (
    <>
      {layout.layoutID > -1 ? (
        <Space>
          {!currentuser?.isSuperAdmin &&
          currentuser?.roleFunctionality.includes(
            FUNCTIONALITY.TABS_KEY.REPORTS
          ) ? (
            <Button
              type="default"
              size="medium"
              disabled={layout.layoutID === 0 ? visibleDownload : false}
              className="mr-2 d-flex align-items-center"
              onClick={() => {
                setIsSaveCustom(true);
                form.setFieldsValue({
                  reportName: layout.layoutID > 0 ? layout.layoutName : "",
                });
              }}
              icon={<FileOutlined />}
            >
              {layout.layoutID > 0 ? "Update" : "Save As New Report"}{" "}
            </Button>
          ) : (
            <Button
              size="medium"
              disabled={true}
              className="mr-2 d-flex align-items-center"
              onClick={() => {
                setIsSaveCustom(true);
                form.setFieldsValue({
                  reportName: layout.layoutID > 0 ? layout.layoutName : "",
                });
              }}
              icon={<FileOutlined />}
            >
              {layout.layoutID > 0 ? "Update" : "Save As New Report"}{" "}
            </Button>
          )}
        </Space>
      ) : (
        ""
      )}
      <Modal
        open={isSaveCustom}
        title={"Report Name"}
        className="theme-modal-wrap"
        bodyStyle={{ padding: "1rem" }}
        closeIcon={<CloseCircleOutlined></CloseCircleOutlined>}
        key="cutomReport"
        onCancel={() => {
          if (!isLoading) {
            setIsSaveCustom(false);
            form.resetFields();
          }
        }}
        maskClosable={false}
        footer={[
          <Button
            type="default"
            key="cancel"
            onClick={() => {
              setIsSaveCustom(false);
              form.resetFields();
            }}
            disabled={isLoading}
          >
            Back
          </Button>,

          <Button
            className="d-flex align-items-center"
            type="primary"
            key="create"
            onClick={() => {
              handleOk();
            }}
            loading={isLoading}
          >
            {layout?.layoutID > 0 ? "Update" : "Create"}
          </Button>,
        ]}
      >
        <Form
          noValidate="novalidate"
          autoComplete="off"
          form={form}
          onFinish={onFinish}
        >
          <Form.Item
            name="reportName"
            rules={[
              { required: true, message: "Please enter report name." },
              { min: 3, message: "Min length is 3." },
              { max: 50, message: "Max length is 50." },
            ]}
          >
            <Input
              placeholder="Enter report name"
              onKeyPress={handleKeyPress}
              onChange={handleChange}
              onPaste={handlePaste}
              onBlur={handleBlur}
              allowClear
              minLength={3}
              maxLength={50}
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
export default CustomReport;
